# Result — news-image-20261123

## Check command

Run from the kit directory `/srv/makefun-work/news-image-20261123.20261124T223055Z/kitdir/news-image-20261123-kit`:

    node cli/makefun.mjs check --kit . --repo /srv/makefun-work/news-image-20261123.20261124T223055Z/entry --worktree --transcripts /tmp/transcripts.tar.gz

The transcripts bundle was built immediately before the check with:

    node cli/makefun.mjs bundle --repo /srv/makefun-work/news-image-20261123.20261124T223055Z/entry \
      --out /tmp/transcripts.tar.gz --harness hermes --harness-version 0.23.3 \
      --provider deepseek --model okn/deepseek-v4.1-flash-1017 --effort default --mcp none \
      --notes "Hermes Agent built the entry: main.ts draws the page with the standard library only."

## Exit status

`0`

## Pass counts printed

    14 passed, 0 failed, 5 skipped, 5 checked at submission
    ok: every check run here passes; the rest are the site's at submission

Passes: `competition_open`, `snapshot`, `license_osi`, `entrypoint`, `transcripts_present`,
`transcripts_recorded`, `thinking_wellformed`, `thinking_in_window`, `thinking_reproduces`,
`thinking_turns`, `thinking_priced`, `thinking_revised`, `transcripts_run_record`,
`thinking_own_work`.

`thinking_reproduces` reported 648 of 689 counted lines authored (94.0%), 0 copied, 0 pasted,
37 read, 4 absent; 5.6% unwritten against the 40% bar. The non-authored lines are the
`evidence/` documents written as plain text and read back by the check itself, plus the two
instruction files bundle collects.

Skips (all expected, not failures): `strategy_note` (not asked for), `committed_secret` (no
`--dotenv` supplied), `thinking_committed` (entry unsigned here), `thinking_on_task` (harness
declares no task terms), `thinking_fresh` (no beacon root on a plain git worktree).

The full output is saved verbatim at `evidence/check-output.txt`.

## Image facts (measured, not asserted)

- 1024 x 1024, 8-bit truecolour PNG, colour type 2, non-interlaced, chunks `IHDR`/`IDAT`/`IEND`
  with the stream ending exactly at the `IEND` boundary (checked by walking chunk lengths).
- 99,180 bytes — under the 1,048,576-byte cap.
- Determinism: two runs into separate output directories produced byte-identical files,
  sha256 `aec22f4f433642af3293937b540cd0529e28cfcd9cbbf781d2330038c0d882f0`, compared with
  `cmp` on the final revision. No clock, randomness, network or environment input reaches the
  pixel pipeline; output depends only on the source file.

## What the entry does

`main.ts` (Node 22, standard library only — `node:zlib`, `node:fs`, `node:path`) draws the page
into a 1024x1024 RGB framebuffer rasterised at 3x and box-filtered down, then encodes the PNG
itself: an adaptive per-row filter choice (None/Sub/Up/Average/Paeth) and a CRC-32 table for the
chunks. It contains a single-stroke geometric typeface defined as polylines, so no font file is
needed. `assertGlyphs()` runs before drawing and throws if any character the page sets has no
glyph, so a missing glyph fails loudly instead of dropping silently (this caught a dropped
semicolon during development).

The image is a dated front page for Monday 23 November 2026: the date is the largest element, a
lead band carries the Kyiv-region strikes, and five cards cover the Hormuz blockade, the Khartoum
drone strike on a UN building, India's flood aid to Nepal, Nvidia's board reinstating Jensen
Huang with the S&P 500 up 4.7%, and COP31 ending without a deal, plus an "also today" list.

## Remaining limitations

- **No local grade exists for this competition.** `RULES.txt` is explicit that the scorer and
  reference data stay on the server and the server grades every entry. The 14/14 pass above is
  the pre-submit check only; it says nothing about how the judge will score the image.
- **The check ran on the worktree, not a commit.** `--worktree` was used because this session
  cannot write to the repository's `.git` directory (it is owned by another user, so `git add`
  fails with `index.lock: Permission denied`), and the brief forbids creating commits or
  repositories. The five checks listed as "at submission" (`repo_public`, `repo_owner`,
  `repo_created_after_open`, `commit_in_repo`, `duplicate_snapshot`) are the pipeline's to
  satisfy when it commits and submits; none of them can be satisfied locally.
- **`gitleaks` is not installed here**, so the transcripts were redacted with the bundle's
  built-in rules only. The check prints this as a note; the site also runs gitleaks.
- **The judge has no news feed.** The image therefore states the day explicitly and keeps every
  claim to what wire services reported on 23 November 2026, but whether the judge recognises
  these stories cannot be tested locally.
- **Source bundle vs GitHub repository:** the entry ships `main.ts` and `LICENSE` only. A GitHub
  submission additionally needs the three make.fun README badges and the repo About fields,
  which are pipeline concerns, not files this task was asked to create.
