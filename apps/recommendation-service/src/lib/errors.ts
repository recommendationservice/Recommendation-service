import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import type { z } from "zod"

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message } },
      err.statusCode as ContentfulStatusCode,
    )
  }

  if (err instanceof HTTPException) {
    return c.json(
      { error: { message: err.message } },
      err.status,
    )
  }

  console.error("Unhandled error:", err)
  return c.json(
    { error: { message: "Internal Server Error" } },
    500,
  )
}

export function validate<T extends z.ZodType>(target: "json" | "query" | "param", schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            message: "Validation failed",
            details: result.error.issues.map((e) => ({
              field: e.path.map(String).join("."),
              message: e.message,
            })),
          },
        },
        400,
      )
    }
  })
}
