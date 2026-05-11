# Blog

## Development

```bash
npm run dev      # start local dev server at localhost:4321
npm run build    # production build
npm run preview  # preview production build locally
```

## Publishing a post

Posts are authored in the Windows writing workspace at `D:\mirkea\projects\blog\posts\`.
Each post lives in a folder named `YYYY-MM-DD-slug\` and contains `_index.md` plus any images.

To bring a post into this repo, run the ingest script from WSL:

```bash
# Preview what would be copied (no files written)
npm run ingest:dry

# Ingest all posts not yet present
npm run ingest

# Ingest a specific post
npm run ingest -- 2026-05-11-parting-ways-with-code11

# Re-ingest / overwrite an existing post
npm run ingest -- --force 2026-04-29-parting-ways-with-code11
npm run ingest -- --force 2026-05-11-hello-world
```

After ingesting, commit and push to deploy:

```bash
git add .
git commit -m "add: parting-ways-with-code11"
git push
```
