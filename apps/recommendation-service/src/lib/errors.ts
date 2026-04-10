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

const errorBody = (message: string) => ({ error: { message } })

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(errorBody(err.message), err.statusCode as ContentfulStatusCode)
  }

  if (err instanceof HTTPException) {
    return c.json(errorBody(err.message), err.status)
  }

  console.error("Unhandled error:", err)
  return c.json(errorBody("Internal Server Error"), 500)
}

function buildValidationErrorBody(issues: z.ZodIssue[]) {
  return {
    error: {
      message: "Validation failed",
      details: issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      })),
    },
  }
}

export function validate<T extends z.ZodType>(target: "json" | "query" | "param", schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(buildValidationErrorBody(result.error.issues), 400)
    }
  })
}
