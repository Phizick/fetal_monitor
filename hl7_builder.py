#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lightweight HL7 v2 ORU^R01 message builder and MLLP sender (no extra deps)
"""

import json
import socket
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

VT = b"\x0b"  # <VT>
FS = b"\x1c"  # <FS>
CR = b"\x0d"  # <CR>


def ts() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def load_config(path: str = "hl7_export_config.json") -> Dict:
    p = Path(path)
    if p.exists():
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "export_configs": {
            "default": {
                "hl7v2": {
                    "version": "2.5",
                    "mllp": {"host": "localhost", "port": 2575, "tls": False},
                    "msh": {
                        "sending_app": "CTG_MONITOR",
                        "sending_facility": "FetalUnit",
                        "receiving_app": "MIS",
                        "receiving_facility": "Hospital",
                        "message_type": "ORU^R01",
                        "processing_id": "P",
                        "version_id": "2.5"
                    },
                    "codes": {"fhr_loinc": "8867-4", "uc_loinc": "11367-0"}
                }
            }
        }
    }


def build_oru_r01(
    patient: Dict,
    data_points: List[Dict],
    cfg: Dict,
    observation_window_sec: int
) -> str:
    # Separators
    field_sep = "|"
    comp_sep = "^"
    rep_sep = "~"
    esc = "\\"
    subcomp_sep = "&"

    msh_conf = cfg["hl7v2"]["msh"]
    codes = cfg["hl7v2"]["codes"]

    # MSH (MSH-1 is the field separator itself, not a field value)
    # Fields: MSH|MSH-2|MSH-3|MSH-4|MSH-5|MSH-6|MSH-7|MSH-8|MSH-9|MSH-10|MSH-11|MSH-12|...|MSH-18
    msh = [
        "MSH",
        "^~\\&",  # MSH-2 encoding characters
        msh_conf.get("sending_app", "CTG_MONITOR"),
        msh_conf.get("sending_facility", "FetalUnit"),
        msh_conf.get("receiving_app", "MIS"),
        msh_conf.get("receiving_facility", "Hospital"),
        ts(),
        "",  # security
        msh_conf.get("message_type", "ORU^R01"),
        f"MSG{ts()}",  # message control id
        msh_conf.get("processing_id", "P"),
        msh_conf.get("version_id", "2.5"),
        "", "", "", "",  # MSH-13..MSH-16 empty
        "UTF-8"  # MSH-18 character set
    ]

    # PID
    # Patient name split to family^given if possible
    full_name = patient.get("full_name", "").strip()
    family = full_name
    given = ""
    if full_name:
        parts = full_name.split()
        if len(parts) >= 2:
            family = parts[-1]
            given = " ".join(parts[:-1])
    pid = [
        "PID",
        "1",
        "",
        f"{patient['id']}^^^HOSP^MR",
        "",
        f"{family}^{given}"
    ]

    # OBR
    obr = [
        "OBR",
        "1",
        f"{patient['id']}^CTG",
        f"{patient['id']}^CTG",
        "CTG^Cardiotocography",
        "",
        ts(),
        "",
        "",
        "",
        "R"
    ]

    # OBX segments
    obx_segments: List[List[str]] = []
    if data_points:
        last = data_points[-1]
        obx_segments.append([
            "OBX","1","NM",
            f"{codes.get('fhr_loinc','8867-4')}^FHR^LN",
            "1",
            str(last.get("fhr_bpm", 0)),
            "bpm","","","F"
        ])
        obx_segments.append([
            "OBX","2","NM",
            f"{codes.get('uc_loinc','11367-0')}^UC^LN",
            "1",
            str(last.get("uc_mmHg", 0)),
            "mm[Hg]","","","F"
        ])
        pathology = any(p.get("pathology") for p in data_points)
        obx_segments.append([
            "OBX","3","CE","PATH^Pathology^L","1",
            "Y^YES^L" if pathology else "N^NO^L",
            "","","","F"
        ])

    lines = [
        field_sep.join(msh),
        field_sep.join(pid),
        field_sep.join(obr),
    ]
    for s in obx_segments:
        lines.append(field_sep.join(s))

    return "\r".join(lines) + "\r"


def send_mllp(message: str, host: str, port: int, timeout: float = 10.0) -> Tuple[bool, str]:
    data = message.encode("utf-8")
    with socket.create_connection((host, port), timeout=timeout) as sock:
        sock.sendall(VT + data + FS + CR)
        sock.settimeout(timeout)
        try:
            resp = sock.recv(4096)
            return True, resp.decode("utf-8", errors="ignore")
        except socket.timeout:
            return True, "ACK timeout"


def get_config(config_name: str = "default", path: str = "hl7_export_config.json") -> Dict:
    cfg = load_config(path)
    return cfg.get("export_configs", {}).get(config_name, cfg["export_configs"]["default"])


