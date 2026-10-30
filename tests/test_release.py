import importlib.util
import json
from pathlib import Path
import unittest
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("create_release", ROOT / "create_release.py")
RELEASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RELEASE)


class ReleaseTest(unittest.TestCase):
    def test_archive_matches_manifest_and_keeps_source_unchanged(self):
        source = (ROOT / "module.json").read_bytes()
        archive_path = RELEASE.build_release()
        manifest = json.loads(source)
        self.assertEqual(manifest["compatibility"], {"verified": "14.369"})
        with ZipFile(archive_path) as archive:
            manifest_bytes = archive.read("module.json")
            self.assertEqual(json.loads(manifest_bytes), manifest)
            self.assertEqual(archive.read("LICENSE"), (ROOT / "LICENSE").read_bytes())
            self.assertEqual(archive.read("main.js"), (ROOT / "main.js").read_bytes())
            for path in [*manifest["esmodules"], *manifest["styles"], *[entry["path"] for entry in manifest["languages"]]]:
                self.assertIn(path, archive.namelist())
            self.assertTrue(all(not name.startswith(("/", "../")) for name in archive.namelist()))
            self.assertNotIn(".git/config", archive.namelist())
            self.assertNotIn("tests/test_release.py", archive.namelist())
        self.assertEqual((ROOT / "module.json").read_bytes(), source)
        self.assertEqual((ROOT / "dist" / "module.json").read_bytes(), manifest_bytes)

    def test_mismatched_release_tag_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "must match module.json version"):
            RELEASE.build_release("v999.0.0")


if __name__ == "__main__":
    unittest.main()
