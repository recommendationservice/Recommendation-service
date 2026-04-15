import { sql } from "drizzle-orm"

import { db } from "../db/client"

export type ScoreBreakdownItem = {
  key: string
  score: number
  events: number
}

export type ScoreBreakdownResult = {
  groupBy: string
  items: ScoreBreakdownItem[]
  totalEvents: number
}

type GetScoreBreakdownInput = {
  userId: string
  groupBy: string
  limit: number
}

type Row = { key: string; score: string | number; events: string | number }

export async function getScoreBreakdown(
  input: GetScoreBreakdownInput,
): Promise<ScoreBreakdownResult> {
  const { userId, groupBy, limit } = input

  const result = await db.execute<Row>(sql`
    WITH per_event AS (
      SELECT e.weight AS weight, k.key AS key
      FROM reco.events e
      JOIN reco.content c ON c.id = e.content_id
      CROSS JOIN LATERAL (
        SELECT CASE jsonb_typeof(c.metadata -> ${groupBy})
          WHEN 'string'  THEN c.metadata ->> ${groupBy}
          WHEN 'number'  THEN c.metadata ->> ${groupBy}
          WHEN 'boolean' THEN c.metadata ->> ${groupBy}
          ELSE NULL
        END AS key
        WHERE jsonb_typeof(c.metadata -> ${groupBy}) IN ('string','number','boolean')
        UNION ALL
        SELECT value::text AS key
        FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(c.metadata -> ${groupBy}) = 'array'
               THEN c.metadata -> ${groupBy}
               ELSE '[]'::jsonb
          END
        ) AS value
      ) AS k
      WHERE e.user_id = ${userId} AND k.key IS NOT NULL
    )
    SELECT key, SUM(weight)::int AS score, COUNT(*)::int AS events
    FROM per_event
    GROUP BY key
    ORDER BY score DESC
    LIMIT ${limit}
  `)

  const totalRows = await db.execute<{ total: string | number }>(sql`
    SELECT COUNT(*)::int AS total FROM reco.events WHERE user_id = ${userId}
  `)

  const items: ScoreBreakdownItem[] = Array.from(result).map((r) => ({
    key: r.key,
    score: Number(r.score),
    events: Number(r.events),
  }))

  const totalEvents = Number(Array.from(totalRows)[0]?.total ?? 0)

  return { groupBy, items, totalEvents }
}
