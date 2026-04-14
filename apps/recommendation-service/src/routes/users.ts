import { Hono } from "hono"

import * as userService from "../services/users"

const userRoutes = new Hono()

userRoutes.delete("/:externalUserId", async (c) => {
  const externalUserId = c.req.param("externalUserId")
  await userService.resetUser(externalUserId)
  return c.body(null, 204)
})

export { userRoutes }
