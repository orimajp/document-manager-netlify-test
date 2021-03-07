const remark = require('remark')
const strip = require('strip-markdown')

export function createSearchData(pageData: string): string {
  return remark().use(strip).processSync(pageData).toString()
}
