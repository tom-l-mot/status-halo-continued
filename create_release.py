import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def build_release(release_tag=None):
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "module.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    if release_tag is not None and release_tag.removeprefix("v") != version:
        raise ValueError(f"Release tag must match module.json version {version}")

    archive_name = f"{manifest['id']}-{version}.zip"
    manifest["download"] = f"{manifest['url']}/releases/download/v{version}/{archive_name}"
    output = root / "dist"
    output.mkdir(exist_ok=True)
    manifest_text = json.dumps(manifest, indent=2) + "\n"
    (output / "module.json").write_text(manifest_text, encoding="utf-8", newline="\n")

    files = [root / name for name in ("LICENSE", "README.md", "main.js")]
    files.extend(path for folder in ("lang", "documentation") for path in (root / folder).rglob("*") if path.is_file())
    archive_path = output / archive_name
    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("module.json", manifest_text)
        for path in files:
            archive.write(path, path.relative_to(root).as_posix())
    return archive_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build a local Foundry module archive without publishing it.")
    parser.add_argument("package_type", choices=["module"])
    parser.add_argument("release_tag", nargs="?")
    args = parser.parse_args()
    print(build_release(args.release_tag))
