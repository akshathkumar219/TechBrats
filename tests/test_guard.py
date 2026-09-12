import os
import shutil
import pytest
from pathlib import Path
from brain.guard import assert_writable, safe_write, lock_path, register_locked_path


@pytest.fixture
def locked_case_env(tmp_path):
    """Set up a test case directory structure with locked 00_Raw_Inputs/."""
    case_dir = tmp_path / "Case_01_Sonipat_Arms"
    raw_inputs = case_dir / "00_Raw_Inputs"
    raw_inputs.mkdir(parents=True)

    fir_file = raw_inputs / "FIR_0142.pdf"
    fir_file.write_bytes(b"%PDF-1.4 Mock FIR Content")

    lock_path(fir_file)

    yield case_dir, raw_inputs, fir_file

    try:
        os.chmod(raw_inputs, 0o777)
        os.chmod(fir_file, 0o777)
    except Exception:
        pass


def test_bypass_1_direct_open(locked_case_env):
    """Bypass 1: Direct open(path, w) on locked raw input must raise PermissionError."""
    _, _, fir_file = locked_case_env

    # Direct open on the 0444 locked file must fail at OS level
    with pytest.raises(PermissionError):
        with open(fir_file, "w") as f:
            f.write("tampered content")

    # Guard-level safe_write must also refuse
    with pytest.raises(PermissionError):
        safe_write(fir_file, b"tampered content")


def test_bypass_2_rename_onto_locked_path(locked_case_env, tmp_path):
    """Bypass 2: os.rename onto a locked path or into 00_Raw_Inputs/ must raise."""
    _, raw_inputs, fir_file = locked_case_env
    attacker_file = tmp_path / "malicious.pdf"
    attacker_file.write_bytes(b"attacker payload")

    # Guard asserts destination is not writable
    with pytest.raises(PermissionError):
        assert_writable(fir_file)

    # Lock the folder to enforce OS-level rejection on replace
    os.chmod(raw_inputs, 0o555)
    with pytest.raises(PermissionError):
        os.rename(str(attacker_file), str(fir_file))


def test_bypass_3_copy_onto_locked_path(locked_case_env, tmp_path):
    """Bypass 3: shutil.copy onto a locked path must raise PermissionError."""
    _, _, fir_file = locked_case_env
    attacker_file = tmp_path / "malicious_copy.pdf"
    attacker_file.write_bytes(b"tampered copy payload")

    # OS level: write to 0444 file raises PermissionError
    with pytest.raises(PermissionError):
        shutil.copy(str(attacker_file), str(fir_file))

    # Guard level assertion also refuses
    with pytest.raises(PermissionError):
        assert_writable(fir_file)


def test_bypass_4_symlink_escape(locked_case_env, tmp_path):
    """Bypass 4: Symlink outside 00_Raw_Inputs/ pointing into locked file must raise."""
    _, _, fir_file = locked_case_env

    outside_dir = tmp_path / "outside_workspace"
    outside_dir.mkdir(parents=True, exist_ok=True)
    symlink_path = outside_dir / "innocent_note.pdf"
    symlink_path.symlink_to(fir_file)

    # assert_writable resolves the symlink and detects the target is locked
    with pytest.raises(PermissionError) as exc:
        assert_writable(symlink_path)
    assert "00_Raw_Inputs" in str(exc.value)

    # safe_write on the symlink must also raise
    with pytest.raises(PermissionError):
        safe_write(symlink_path, b"exploit write through symlink")

    # Direct OS open on symlink also fails because target is 0444
    with pytest.raises(PermissionError):
        with open(symlink_path, "w") as f:
            f.write("exploit")
