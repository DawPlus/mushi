import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGithubTrending } from '../src/news/github-trending.js'

const example = (name: string, stars: string) => `
<article class="Box-row">
<h2 class="h3 lh-condensed"><a href="/${name}" class="Link"><span> org / </span>repo</a></h2>
<p class="col-9 color-fg-muted my-1 tmp-pr-4">A useful &amp; safe tool</p>
<span itemprop="programmingLanguage">TypeScript</span>
<span class="d-inline-block float-sm-right">${stars} stars today</span>
</article>`
test('extracts GitHub trending display order, description, language and daily stars', () => {
  const input = Array.from({ length: 7 }, (_, index) => example('org/repo' + index, (1000 - index).toLocaleString('en-US'))).join('')
  const items = parseGithubTrending(input)
  assert.equal(items.length, 5)
  assert.equal(items[0].name, 'org/repo0')
  assert.equal(items[0].description, 'A useful & safe tool')
  assert.equal(items[0].starsToday, 1000)
  assert.equal(items[0].language, 'TypeScript')
  assert.equal(items[4].rank, 5)
})
test('ignores invalid repo links and empty responses', () => {
  assert.deepEqual(parseGithubTrending('nothing'), [])
  assert.deepEqual(parseGithubTrending(example('bad/name/extra', '123')), [])
})
