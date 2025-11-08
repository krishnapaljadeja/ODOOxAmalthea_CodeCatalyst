/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      })

      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          error: 'Validation Error',
          errors: result.error.errors,
        })
      }

      // Replace request data with validated data
      req.body = result.data.body || req.body
      req.query = result.data.query || req.query
      req.params = result.data.params || req.params

      next()
    } catch (error) {
      next(error)
    }
  }
}

