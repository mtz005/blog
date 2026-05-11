#!/usr/bin/env bash
# Ingest posts from the Windows writing workspace into the Astro blog repo.
#
# Source:      /mnt/d/mirkea/projects/blog/posts/YYYY-MM-DD-slug/
# Destination: <repo>/src/content/blog/slug/
#
# Each source folder must contain _index.md (the post).
# _linkedin.md and any other _-prefixed files are skipped.
# Images (*.png, *.jpg, *.jpeg, *.gif, *.webp, *.svg, *.avif) are copied alongside.
#
# Usage:
#   ./scripts/ingest.sh                              # ingest all new posts
#   ./scripts/ingest.sh 2026-05-11-my-post           # ingest one specific post folder
#   ./scripts/ingest.sh --dry-run                    # preview without writing
#   ./scripts/ingest.sh --force                      # overwrite existing slugs
#   ./scripts/ingest.sh --force 2026-05-11-my-post   # force-update one post

set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_ROOT="/mnt/d/mirkea/projects/blog/posts"
DEST_ROOT="${REPO_ROOT}/src/content/blog"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
DRY_RUN=false
FORCE=false
TARGET_FOLDER=""

for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
    --*)
      echo "Unknown flag: ${arg}" >&2
      exit 1
      ;;
    *)
      if [[ -n "${TARGET_FOLDER}" ]]; then
        echo "Only one target folder may be specified." >&2
        exit 1
      fi
      TARGET_FOLDER="${arg}"
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "$*"; }
info() { echo "  $*"; }
warn() { echo "WARNING: $*" >&2; }

derive_slug() {
  # Strip leading YYYY-MM-DD- prefix if present, otherwise use folder name as-is.
  local folder="$1"
  if [[ "${folder}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-(.+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "${folder}"
  fi
}

copy_file() {
  local src="$1" dest="$2"
  if [[ "${DRY_RUN}" == true ]]; then
    info "[dry-run] copy: ${src} → ${dest}"
  else
    cp -- "${src}" "${dest}"
  fi
}

make_dir() {
  local dir="$1"
  if [[ "${DRY_RUN}" == true ]]; then
    info "[dry-run] mkdir: ${dir}"
  else
    mkdir -p -- "${dir}"
  fi
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if [[ ! -d "${SOURCE_ROOT}" ]]; then
  echo "Source directory not found: ${SOURCE_ROOT}" >&2
  echo "Is the D: drive mounted? Run: ls /mnt/d/" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Collect folders to process
# ---------------------------------------------------------------------------
declare -a FOLDERS=()

if [[ -n "${TARGET_FOLDER}" ]]; then
  if [[ ! -d "${SOURCE_ROOT}/${TARGET_FOLDER}" ]]; then
    echo "Folder not found in source: ${SOURCE_ROOT}/${TARGET_FOLDER}" >&2
    exit 1
  fi
  FOLDERS=("${TARGET_FOLDER}")
else
  while IFS= read -r -d '' entry; do
    FOLDERS+=("$(basename "${entry}")")
  done < <(find "${SOURCE_ROOT}" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)
fi

if [[ ${#FOLDERS[@]} -eq 0 ]]; then
  log "No post folders found in ${SOURCE_ROOT}."
  exit 0
fi

[[ "${DRY_RUN}" == true ]] && log "(dry-run mode — no files will be written)"
echo ""

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
INGESTED=0
SKIPPED=0
ERRORS=0

for folder in "${FOLDERS[@]}"; do
  src_dir="${SOURCE_ROOT}/${folder}"
  slug="$(derive_slug "${folder}")"
  dest_dir="${DEST_ROOT}/${slug}"
  src_md="${src_dir}/_index.md"

  # Check source markdown exists
  if [[ ! -f "${src_md}" ]]; then
    warn "${folder}: _index.md not found — skipping."
    (( ERRORS++ )) || true
    continue
  fi

  # Detect a legacy flat file for the same slug (e.g. slug.md alongside slug/)
  flat_file="${DEST_ROOT}/${slug}.md"

  # Skip already-ingested posts unless --force
  if [[ -d "${dest_dir}" && "${FORCE}" == false ]]; then
    log "SKIP  ${slug}  (already exists; use --force to overwrite)"
    (( SKIPPED++ )) || true
    continue
  fi

  action="INGEST"
  [[ -d "${dest_dir}" ]] && action="UPDATE"
  log "${action} ${folder}  →  src/content/blog/${slug}/"

  # Remove conflicting flat file so Astro doesn't see two posts for the same slug
  if [[ -f "${flat_file}" ]]; then
    if [[ "${DRY_RUN}" == true ]]; then
      info "[dry-run] remove flat file: src/content/blog/${slug}.md"
    else
      rm -- "${flat_file}"
      info "removed legacy flat file: ${slug}.md"
    fi
  fi

  make_dir "${dest_dir}"

  # Copy post content
  copy_file "${src_md}" "${dest_dir}/index.md"
  info "_index.md → index.md"

  # Copy images (skip _-prefixed files and _linkedin.md)
  IMAGE_EXTS="png jpg jpeg gif webp svg avif"
  found_images=false
  for ext in ${IMAGE_EXTS}; do
    while IFS= read -r -d '' img; do
      basename_img="$(basename "${img}")"
      # Skip any _-prefixed file
      [[ "${basename_img}" == _* ]] && continue
      copy_file "${img}" "${dest_dir}/${basename_img}"
      info "${basename_img}"
      found_images=true
    done < <(find "${src_dir}" -maxdepth 1 -type f -iname "*.${ext}" -print0 2>/dev/null)
  done

  [[ "${found_images}" == false ]] && info "(no images)"

  (( INGESTED++ )) || true
  echo ""
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "Done. Ingested: ${INGESTED}  Skipped: ${SKIPPED}  Errors: ${ERRORS}"
[[ "${DRY_RUN}" == true ]] && echo "(dry-run — no files were written)"
[[ "${ERRORS}" -gt 0 ]] && exit 1 || exit 0
