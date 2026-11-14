function _sqlify(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (value === undefined) {
    return null
  }
  return value
}

export default (c: {env: {DB: D1Database}}) => {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    return c.env.DB.prepare(strings.join("?")).bind(...values.map(_sqlify))
  }
}
