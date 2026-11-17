# Nemischa — one entry point for the usual tasks.
.PHONY: all data anki site test e2e dev clean

all: data anki site

data:  ## raw word lists -> data/*.json (+ QA report)
	cd pipeline && uv run nemischa-build

anki:  ## data/*.json -> site/public/anki/*.apkg
	cd pipeline && uv run nemischa-anki

site:  ## static site -> site/dist
	cd site && npm ci && npm run build

test:  ## unit tests for the pipeline and the site
	cd pipeline && uv run pytest -q
	cd site && npm test

e2e:  ## browser tests against the built site
	cd site && npm run e2e

dev:  ## local site at http://localhost:4321/nemischa/
	cd site && npm run dev

clean:
	rm -rf site/dist site/.astro site/public/anki site/coverage site/test-results site/playwright-report
