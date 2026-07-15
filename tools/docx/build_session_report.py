from __future__ import annotations

from pathlib import Path
from typing import Iterable, Sequence

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "Beonely-Repository-Audit-and-Remediation-Report-2026-07-11.docx"

BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
INK = "0B2545"
MUTED = "5B6573"
LIGHT_GRAY = "F2F4F7"
BLUE_GRAY = "E8EEF5"
CALLOUT = "F4F6F9"
WHITE = "FFFFFF"
GREEN = "1F6B45"
AMBER = "7A5A00"
RED = "9B1C1C"
BLACK = "111111"

CONTENT_DXA = 9360
TABLE_INDENT_DXA = 120
CELL_MARGINS = {"top": 80, "bottom": 80, "start": 120, "end": 120}


def set_run_font(
    run,
    *,
    name: str = "Calibri",
    size: float | None = None,
    color: str | None = None,
    bold: bool | None = None,
    italic: bool | None = None,
) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def keep_with_next(paragraph) -> None:
    paragraph.paragraph_format.keep_with_next = True


def prevent_widow(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    if p_pr.find(qn("w:widowControl")) is None:
        p_pr.append(OxmlElement("w:widowControl"))


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.find(qn("w:tcMar"))
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge, value in CELL_MARGINS.items():
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_geometry(table, widths_dxa: Sequence[int]) -> None:
    if sum(widths_dxa) != CONTENT_DXA:
        raise ValueError(f"Table widths must total {CONTENT_DXA}: {widths_dxa}")

    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl_pr = table._tbl.tblPr

    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(CONTENT_DXA))
    tbl_w.set(qn("w:type"), "dxa")

    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), str(TABLE_INDENT_DXA))
    tbl_ind.set(qn("w:type"), "dxa")

    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)

    for row in table.rows:
        for index, cell in enumerate(row.cells):
            cell.width = Inches(widths_dxa[index] / 1440)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(widths_dxa[index]))
            tc_w.set(qn("w:type"), "dxa")
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def mark_header_row(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    marker = tr_pr.find(qn("w:tblHeader"))
    if marker is None:
        marker = OxmlElement("w:tblHeader")
        tr_pr.append(marker)
    marker.set(qn("w:val"), "true")


def configure_styles(doc: Document) -> None:
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.10

    heading_tokens = {
        "Heading 1": (16, BLUE, 16, 8),
        "Heading 2": (13, BLUE, 12, 6),
        "Heading 3": (12, DARK_BLUE, 8, 4),
    }
    for name, (size, color, before, after) in heading_tokens.items():
        style = styles[name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    custom_styles = {
        "Memo Title": (24, INK, True, False, 0, 4, 1.0),
        "Memo Subtitle": (13.5, MUTED, False, False, 0, 14, 1.0),
        "Kicker": (9, BLUE, True, False, 0, 5, 1.0),
        "Metadata": (10.5, BLACK, False, False, 0, 2, 1.0),
        "Muted": (9.5, MUTED, False, False, 0, 5, 1.05),
        "Code Block": (8.5, DARK_BLUE, False, False, 3, 5, 1.0),
        "Finding Evidence": (9, MUTED, False, False, 0, 6, 1.05),
    }
    for name, (size, color, bold, italic, before, after, spacing) in custom_styles.items():
        if name in styles:
            style = styles[name]
        else:
            style = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        font_name = "Consolas" if name == "Code Block" else "Calibri"
        style.font.name = font_name
        style._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), font_name)
        style._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), font_name)
        style._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), font_name)
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = bold
        style.font.italic = italic
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = spacing


def next_id(elements, attr: str) -> int:
    values: list[int] = []
    for element in elements:
        raw = element.get(qn(attr))
        if raw is not None:
            try:
                values.append(int(raw))
            except ValueError:
                pass
    return max(values, default=0) + 1


def make_abstract_numbering(doc: Document, *, ordered: bool) -> int:
    root = doc.part.numbering_part.element
    abstract_id = next_id(root.findall(qn("w:abstractNum")), "w:abstractNumId")
    abstract = OxmlElement("w:abstractNum")
    abstract.set(qn("w:abstractNumId"), str(abstract_id))

    multi = OxmlElement("w:multiLevelType")
    multi.set(qn("w:val"), "singleLevel")
    abstract.append(multi)

    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")
    lvl.append(start)
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), "decimal" if ordered else "bullet")
    lvl.append(num_fmt)
    lvl_text = OxmlElement("w:lvlText")
    lvl_text.set(qn("w:val"), "%1." if ordered else "•")
    lvl.append(lvl_text)
    lvl_jc = OxmlElement("w:lvlJc")
    lvl_jc.set(qn("w:val"), "left")
    lvl.append(lvl_jc)

    p_pr = OxmlElement("w:pPr")
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "num")
    tab.set(qn("w:pos"), "720")
    tabs.append(tab)
    p_pr.append(tabs)
    ind = OxmlElement("w:ind")
    ind.set(qn("w:left"), "720")
    ind.set(qn("w:hanging"), "360")
    p_pr.append(ind)
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:after"), "160")
    spacing.set(qn("w:line"), "280")
    spacing.set(qn("w:lineRule"), "auto")
    p_pr.append(spacing)
    lvl.append(p_pr)
    abstract.append(lvl)
    # OOXML requires every abstractNum before the concrete num instances.
    # Word repairs mixed ordering unpredictably and can fall back to bullets.
    first_num = root.find(qn("w:num"))
    if first_num is None:
        root.append(abstract)
    else:
        root.insert(root.index(first_num), abstract)
    return abstract_id


def make_num_instance(doc: Document, abstract_id: int) -> int:
    root = doc.part.numbering_part.element
    num_id = next_id(root.findall(qn("w:num")), "w:numId")
    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_id))
    num.append(abstract_ref)
    root.append(num)
    return num_id


def attach_numbering(paragraph, num_id: int) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    num_pr = p_pr.find(qn("w:numPr"))
    if num_pr is None:
        num_pr = OxmlElement("w:numPr")
        p_pr.append(num_pr)
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    num_id_node = OxmlElement("w:numId")
    num_id_node.set(qn("w:val"), str(num_id))
    num_pr.append(ilvl)
    num_pr.append(num_id_node)


def add_list(
    doc: Document,
    items: Iterable[str | tuple[str, str]],
    *,
    ordered: bool = False,
) -> None:
    abstract_id = make_abstract_numbering(doc, ordered=ordered)
    num_id = make_num_instance(doc, abstract_id)
    for item in items:
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(8)
        paragraph.paragraph_format.line_spacing = 1.167
        attach_numbering(paragraph, num_id)
        if isinstance(item, tuple):
            label, text = item
            label_run = paragraph.add_run(f"{label} ")
            set_run_font(label_run, bold=True)
            text_run = paragraph.add_run(text)
            set_run_font(text_run)
        else:
            run = paragraph.add_run(item)
            set_run_font(run)
        prevent_widow(paragraph)


def add_table(
    doc: Document,
    headers: Sequence[str],
    rows: Sequence[Sequence[str]],
    widths_dxa: Sequence[int],
    *,
    font_size: float = 9.2,
) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    header = table.rows[0]
    mark_header_row(header)
    for index, label in enumerate(headers):
        cell = header.cells[index]
        set_cell_shading(cell, LIGHT_GRAY)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.0
        run = p.add_run(label)
        set_run_font(run, size=font_size, bold=True, color=INK)

    for row_values in rows:
        row = table.add_row()
        for index, value in enumerate(row_values):
            cell = row.cells[index]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.05
            run = p.add_run(str(value))
            set_run_font(run, size=font_size, color=BLACK)
    set_table_geometry(table, widths_dxa)
    after = doc.add_paragraph()
    after.paragraph_format.space_before = Pt(4)
    after.paragraph_format.space_after = Pt(4)


def add_callout(doc: Document, label: str, text: str, *, color: str = BLUE) -> None:
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.left_indent = Inches(0.16)
    paragraph.paragraph_format.right_indent = Inches(0.08)
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(10)
    paragraph.paragraph_format.line_spacing = 1.10
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), CALLOUT)
    p_pr.append(shd)
    borders = OxmlElement("w:pBdr")
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "single")
    start.set(qn("w:sz"), "18")
    start.set(qn("w:space"), "6")
    start.set(qn("w:color"), color)
    borders.append(start)
    p_pr.append(borders)
    label_run = paragraph.add_run(f"{label}: ")
    set_run_font(label_run, bold=True, color=color)
    body_run = paragraph.add_run(text)
    set_run_font(body_run)
    prevent_widow(paragraph)


def add_labeled_paragraph(doc: Document, label: str, text: str) -> None:
    paragraph = doc.add_paragraph()
    label_run = paragraph.add_run(f"{label}. ")
    set_run_font(label_run, bold=True, color=INK)
    text_run = paragraph.add_run(text)
    set_run_font(text_run)
    prevent_widow(paragraph)


def add_code_line(doc: Document, text: str) -> None:
    paragraph = doc.add_paragraph(style="Code Block")
    paragraph.paragraph_format.left_indent = Inches(0.16)
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), LIGHT_GRAY)
    p_pr.append(shd)
    run = paragraph.add_run(text)
    set_run_font(run, name="Consolas", size=8.5, color=DARK_BLUE)


def add_section(doc: Document, title: str, *, new_page: bool = True) -> None:
    if new_page:
        doc.add_page_break()
    heading = doc.add_paragraph(title, style="Heading 1")
    keep_with_next(heading)


def add_finding(
    doc: Document,
    finding_id: str,
    title: str,
    impact: str,
    remediation: str,
    evidence: str,
    *,
    severity_color: str,
) -> None:
    heading = doc.add_paragraph(style="Heading 3")
    badge = heading.add_run(f"{finding_id}  ")
    set_run_font(badge, size=10.5, color=severity_color, bold=True)
    title_run = heading.add_run(title)
    set_run_font(title_run, size=12, color=DARK_BLUE, bold=True)
    keep_with_next(heading)
    add_labeled_paragraph(doc, "Impact", impact)
    add_labeled_paragraph(doc, "Remediation", remediation)
    p = doc.add_paragraph(style="Finding Evidence")
    run = p.add_run(f"Evidence: {evidence}")
    set_run_font(run, size=9, color=MUTED, italic=True)


def add_page_field(paragraph, field: str) -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instruction = OxmlElement("w:instrText")
    instruction.set(qn("xml:space"), "preserve")
    instruction.text = field
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:t")
    placeholder.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instruction, separate, placeholder, end])


def configure_page(doc: Document) -> None:
    doc.settings.odd_and_even_pages_header_footer = False
    for section in doc.sections:
        section.different_first_page_header_footer = False
        section.page_width = Inches(8.5)
        section.page_height = Inches(11)
        section.top_margin = Inches(1)
        section.right_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.header_distance = Inches(0.492)
        section.footer_distance = Inches(0.492)

        header = section.header
        header_p = header.paragraphs[0]
        header_p.paragraph_format.space_after = Pt(0)
        header_p.paragraph_format.tab_stops.add_tab_stop(
            Inches(6.5), WD_TAB_ALIGNMENT.RIGHT
        )
        left = header_p.add_run("BEONELY | REPOSITORY AUDIT")
        set_run_font(left, size=8.5, color=MUTED, bold=True)
        header_p.add_run("\t")
        right = header_p.add_run("15 JULY 2026")
        set_run_font(right, size=8.5, color=MUTED)

        footer = section.footer
        footer_p = footer.paragraphs[0]
        footer_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        footer_p.paragraph_format.space_before = Pt(0)
        lead = footer_p.add_run("Beonely engineering review  |  Page ")
        set_run_font(lead, size=8.5, color=MUTED)
        add_page_field(footer_p, "PAGE")
        of_run = footer_p.add_run(" of ")
        set_run_font(of_run, size=8.5, color=MUTED)
        add_page_field(footer_p, "NUMPAGES")

    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")


def remove_inline_backtick_markers(doc: Document) -> None:
    """Remove Markdown code markers while preserving the surrounding run styles."""

    def clean_paragraphs(paragraphs) -> None:
        for paragraph in paragraphs:
            for run in paragraph.runs:
                if "`" in run.text:
                    run.text = run.text.replace("`", "")

    clean_paragraphs(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                clean_paragraphs(cell.paragraphs)
    for section in doc.sections:
        clean_paragraphs(section.header.paragraphs)
        clean_paragraphs(section.footer.paragraphs)


def build_document() -> Document:
    doc = Document()
    configure_styles(doc)
    configure_page(doc)

    props = doc.core_properties
    props.title = "Beonely Repository Audit and Remediation Report"
    props.subject = "Repository restructuring, security remediation, admin console, and verification"
    props.author = ""
    props.last_modified_by = ""
    props.keywords = "Beonely, repository audit, security, admin, payments, email"

    kicker = doc.add_paragraph(style="Kicker")
    kicker.add_run("TECHNICAL AUDIT / REMEDIATION REPORT")
    title = doc.add_paragraph(style="Memo Title")
    title.add_run("Beonely Repository Audit\nand Remediation Report")
    subtitle = doc.add_paragraph(style="Memo Subtitle")
    subtitle.add_run(
        "Full-session record of repository understanding, restructuring, vulnerability remediation, admin console modernization, and release verification."
    )

    metadata = [
        ("Repository", "beonely"),
        ("Workspace", "Repository root; file paths are shown relative to it"),
        ("Review date", "11–15 July 2026"),
        ("Scope", "Frontend, API, Supabase, Storage, payments, email, admin UX, CI, and documentation"),
        ("Source status", "Runtime code head 925f6c8 is pushed on codex/repository-hardening-admin-redesign; draft PR #2 targets main and remains open and unmerged"),
        ("Main boundary", "main and origin/main remained at 059af73e22925ea5a421e3a9d8d2af2ae9541c69"),
        ("Database status", "Supabase Preview attempted a clean replay and failed in the legacy May chain before the July hardening migrations; production was not changed"),
    ]
    for label, value in metadata:
        paragraph = doc.add_paragraph(style="Metadata")
        label_run = paragraph.add_run(f"{label}: ")
        set_run_font(label_run, size=10.5, bold=True, color=INK)
        value_run = paragraph.add_run(value)
        set_run_font(value_run, size=10.5, color=BLACK)

    add_callout(
        doc,
        "Outcome",
        "The repository was reduced to its real product surface, its highest-risk authorization/payment/email paths were redesigned, and the admin experience was rebuilt. Local gates and GitHub Quality passed. Hosted preview validation remains incomplete because Vercel rejected project access before deployment and Supabase Preview stopped in the legacy May migration chain.",
        color=AMBER,
    )

    add_section(doc, "1. Executive summary")
    doc.add_paragraph(
        "The initial repository combined a working ServiceNow job marketplace with inherited admin-template scaffolding and several security-sensitive workflows that trusted the browser or relied on non-atomic check-then-act logic. The review covered the full route tree, feature modules, Vercel functions, Supabase schema and RLS, Storage policies, Razorpay integration, Resend integration, cron jobs, configuration, dependency graph, tests, and the built application."
    )
    doc.add_paragraph(
        "The completed implementation now follows a narrow trust model: public users see explicit projections; signed-in users see owner-scoped rows; staff cross-account access is available only through a confirmed, allowlisted, enabled server identity; service-role operations stay in serverless functions; payment and email work is claimed and fulfilled atomically; and private candidate assets are shared through short-lived signed URLs."
    )
    add_table(
        doc,
        ["Severity", "Findings", "Source status", "Primary risk themes"],
        [
            ["Critical", "3", "Fixed in repository", "Privilege escalation, payment integrity, open email relay"],
            ["High", "13", "Fixed in repository", "PII, consent, signed events, asset privacy, capture reconciliation"],
            ["Medium", "12", "Fixed in repository", "Abuse controls, retries, lifecycle accounting, operations"],
            ["Low / quality", "10", "Fixed in repository", "Headers, UX, accessibility, dead code, CI, runtime startup"],
        ],
        [1440, 1080, 1800, 5040],
    )
    doc.add_paragraph(
        "The original audit logged 33 findings. Final branch verification added three high-severity payment-capture persistence findings and two low/quality browser-accessibility findings, for 38 findings in total."
    )
    add_list(
        doc,
        [
            ("Repository scope", "Implementation commit 00017cb changes 374 files with 16,659 insertions and 12,913 deletions; inherited demo/template modules were removed and the repository-wide formatting baseline was normalized."),
            ("Security architecture", "Fifteen cumulative July hardening migrations now encode RLS, public projections, admin boundaries, rate limits, private assets, payment lifecycle, email claims, and suppression."),
            ("Admin console", "The console is organized into Overview, Marketplace, Growth, and Operations with server-backed metrics, explicit error states, and responsive navigation."),
            ("Verification", "33 API test files / 108 tests, 59 browser test files / 285 tests, 22 responsive passes with 2 expected desktop-only skips, both TypeScript checks, build, lint (0 errors / 23 nonblocking warnings), formatting, Knip, production audit, diff hygiene, local built-browser smoke, and GitHub Quality passed."),
        ],
    )

    add_section(doc, "2. System understood and reviewed")
    doc.add_paragraph(
        "Beonely is a React and TypeScript single-page application served from Vite/Vercel. TanStack Router owns file-based navigation; TanStack Query manages client data. Supabase provides authentication, PostgreSQL, Row Level Security, Storage, and security-definer RPCs. Vercel functions implement privileged operations and provider webhooks. Razorpay processes listing purchase, renewal, and boost flows. Resend handles transactional and marketing delivery."
    )
    add_table(
        doc,
        ["Layer", "Primary locations", "Responsibility"],
        [
            ["Public web", "src/routes, src/features/jobs", "Discovery, job detail, hiring lead capture, portfolios, auth entry"],
            ["Candidate", "src/features/candidate, authenticated candidate routes", "Profile, resume, certificate assets, saved applications, portfolio"],
            ["Recruiter", "src/features/recruiter", "Jobs, applicant pipeline, listing editor, pricing and payment dialogs"],
            ["Admin", "src/features/admin, /api/admin/*", "Moderation, accounts, candidates, revenue, leads, campaigns, email operations"],
            ["Server", "api/_handlers, api/_lib", "Authorization, validation, provider calls, webhooks, cron, signed assets"],
            ["Database", "supabase/migrations", "Data model, constraints, RLS, RPCs, triggers, Storage policies"],
        ],
        [1440, 3000, 4920],
    )
    add_labeled_paragraph(
        doc,
        "Public trust boundary",
        "Anonymous users read only the `public_jobs` projection and controlled portfolio/share endpoints. The base jobs table is not an anonymous API because it contains recruiter fields that RLS cannot hide column-by-column.",
    )
    add_labeled_paragraph(
        doc,
        "Authenticated trust boundary",
        "Candidates and recruiters retain only their own records through RLS. Cross-account administration requires the allowlisted server API; the browser is never authoritative for role, price, identity, delivery completion, or provider state.",
    )
    add_labeled_paragraph(
        doc,
        "Operational trust boundary",
        "The service role is confined to Vercel functions. Raw provider payloads are authenticated before parsing. Cron work requires a secret and uses bounded, resumable batches.",
    )

    add_section(doc, "3. Repository restructuring")
    doc.add_paragraph(
        "The repository was restructured by removing unrelated template/demo surfaces and concentrating reusable logic around real Beonely domains. This reduced false navigation, unused dependencies, duplicate components, and the chance that a future contributor modifies a non-production path thinking it is live."
    )
    add_list(
        doc,
        [
            ("Removed demo features", "Deleted inherited apps, chats, tasks, generic users, example dashboard widgets, sample JSON, and obsolete settings/error routes."),
            ("Removed dead component kits", "Deleted unused generic data-table wrappers, table test utilities, unused selectors/dialog helpers, brand icon catalogs, layout-icon variants, and skeleton/pagination modules that were no longer in the route tree."),
            ("Consolidated server logic", "Kept Vercel entrypoints small and moved reusable policy into `_handlers` and `_lib` modules for admin auth, rate limits, raw bodies, email claims, payment fulfillment, public slugs, private assets, and site origins."),
            ("Created explicit admin API surface", "Added list/mutation handlers for jobs, recruiters, candidates, revenue, dashboard metrics, hiring requests, and email operations, with explicit router mappings."),
            ("Normalized documentation and quality configuration", "Updated environment guidance, added CI, `.gitattributes`, Knip configuration, and this repository guide/security register."),
        ],
    )
    add_callout(
        doc,
        "Static-analysis result",
        "Knip reports no unused files or dependencies after the cleanup. The production dependency audit reports no known vulnerabilities.",
        color=GREEN,
    )

    add_section(doc, "4. Critical and high-severity remediation")
    doc.add_paragraph(
        "This section records the issues with direct confidentiality, integrity, consent, or provider-abuse impact. Each item is also listed in `docs/SECURITY_AUDIT.md`."
    )
    doc.add_paragraph("Critical findings", style="Heading 2")
    add_finding(
        doc,
        "C-01",
        "Admin privilege and cross-account RLS exposure",
        "A browser admin path or permissive policy could expose or modify recruiter, candidate, application, payment, hiring, audit, and email data.",
        "Server authorization now requires a valid token, confirmed email, server allowlist, enabled recruiter account, and database admin role. Cross-account browser policies were removed; admin UI calls explicit server routes.",
        "api/_lib/admin-auth.ts; migrations 20260710010000, 20260710210000, 20260710300000",
        severity_color=RED,
    )
    add_finding(
        doc,
        "C-02",
        "Payment amount, replay, and fulfillment integrity",
        "Underpayment, duplicate checkouts, repeated renewal/boost, or captured funds without consistent job state were possible when browser input and separate writes were trusted.",
        "The server selects price from an allowlist, reserves a versioned immutable snapshot, creates/reuses a unique provider receipt, verifies signatures, and fulfills through a replay-safe database RPC. Capture/refund/dispute/failure lifecycle is deduplicated.",
        "api/create-order.ts; api/verify-payment.ts; api/razorpay-webhook.ts; payment hardening migrations",
        severity_color=RED,
    )
    add_finding(
        doc,
        "C-03",
        "Arbitrary-recipient email relay",
        "An attacker could abuse the project's mail provider and reputation by choosing recipients or content.",
        "The dispatch surface now accepts only server-allowlisted transactional triggers, trusted recipient derivation, bounded payloads, authentication, and rate limits. Negative tests reject arbitrary recipients and content.",
        "api/email/dispatch.ts; api/_tests/email-dispatch-security.test.ts",
        severity_color=RED,
    )

    doc.add_paragraph("High findings", style="Heading 2")
    high_items = [
        ("H-01", "Public recruiter PII", "Public discovery now uses the redacted `public_jobs` view; anonymous base-table SELECT is revoked."),
        ("H-02", "Implicit marketing opt-in", "The dangerous backfill was deleted; newsletters use double opt-in and consent is never inferred from account/application data."),
        ("H-03", "Webhook fail-open/raw-body gaps", "Razorpay and Resend authenticate raw payloads before parsing, require production secrets, and deduplicate events."),
        ("H-04", "Application identity tampering", "Triggers derive candidate identity, email, recruiter, status, and snapshots from authenticated/trusted rows; authenticated updates preserve immutable data."),
        ("H-05", "Public resumes/certificates", "Candidate assets are private, owner scoped, quota/MIME constrained, and exposed only through short-lived authorized signed URLs."),
        ("H-06", "Unsafe slugs, URLs, and logo fetching", "Slugs are constrained; redirects are same-origin; share endpoints do not fetch arbitrary URLs; logos allow only app Storage or exact trusted LinkedIn CDN hosts."),
        ("H-07", "Transactional email races", "Atomic claims, fencing tokens, stale retries, stable provider idempotency keys, and explicit completion replace check-then-send logic."),
        ("H-08", "Campaign replay/audience mutation", "Campaign recipients are snapshotted and delivery is resumable and per-recipient idempotent; test sends do not create subscribers."),
        ("H-09", "Bounce/complaint suppression", "Signed Resend events update delivery state and suppress complaints, suppression events, and permanent bounces."),
        ("H-10", "Direct browser admin PII", "Jobs, recruiters, candidates, revenue, leads, dashboard, and email operations now use allowlisted server endpoints with narrow projections."),
        ("H-11", "Disabled recruiter at capture", "A verified capture is recorded as paid unless already refunded, flagged `recruiter_disabled_at_capture` for manual review, and denied entitlement/job changes."),
        ("H-12", "Reused provider payment ID", "The affected checkout records the financial movement and `provider_payment_reused` review state without violating provider-ID uniqueness or granting entitlement."),
        ("H-13", "Capture for a closed/failed checkout", "Late capture persists paid timing/identifier data where safe, flags `capture_for_closed_checkout`, and withholds entitlement."),
    ]
    add_list(doc, [(f"{i} - {t}", s) for i, t, s in high_items])

    add_section(doc, "5. Medium and defense-in-depth remediation")
    medium_items = [
        ("M-01", "Abuse rate limits", "Database-backed IP/user claims cover public and authenticated abuse-sensitive endpoints."),
        ("M-02", "Redirect normalization", "Protocol-relative paths, backslashes, and control characters are rejected; safe same-origin paths are preserved."),
        ("M-03", "Cron authorization", "A strong `CRON_SECRET` is required; missing/invalid authorization fails closed and required work failures remain retryable."),
        ("M-04", "Unbounded weekly digest", "Each invocation sends at most 50 recipients and resumes; Monday scheduling supplies controlled capacity."),
        ("M-05", "Reminder duplicate race", "Listing-expiry reminders use the claimed dispatcher and validated shared site origin."),
        ("M-06", "Unsubscribe by GET", "GET shows confirmation only; POST performs the idempotent mutation."),
        ("M-07", "Receipt email replay", "Successful fulfillment replays re-enter the deduplicated dispatcher so failed/stale mail claims can retry."),
        ("M-08", "Incomplete payment lifecycle reporting", "Admin revenue includes capture, paid time, refunds, disputes, failures, manual review, and capped net revenue."),
        ("M-09", "Moderation/payment race", "Outstanding checkout checks and database enforcement prevent rejection while payment is active; optimistic concurrency detects job changes."),
        ("M-10", "Hard-coded lead recipients", "Hiring-request recipients come from server-only configuration and failures are surfaced."),
        ("M-11", "Unsafe scrape expiry", "Missing-payload expiry is opt-in and health guarded; age and liveness expiry remain bounded."),
        ("M-12", "Misleading admin counts", "Server aggregates and explicit loading/error/empty states replace silent zero/empty fallbacks."),
    ]
    add_list(doc, [(f"{i} - {t}", s) for i, t, s in medium_items])
    add_labeled_paragraph(
        doc,
        "Final capture reconciliation",
        "H-11 through H-13 close the remaining verified-capture persistence gaps. Disabled recruiters, provider-ID reuse, and captures for failed/closed checkouts now remain visible as paid/manual-review financial movements without granting job entitlement. Partial refunds also compare against provider-verified cumulative `amount_refunded`; stale provider state remains retryable and net revenue caps refund-plus-chargeback subtraction.",
    )
    add_labeled_paragraph(
        doc,
        "Payment abuse protection",
        "Initial listing, renewal, and boost dialogs obtain Turnstile tokens. The server validates the checkout-specific action and request IP and fails closed on verification timeout when the secret is configured.",
    )

    add_section(doc, "6. Email, consent, and delivery architecture")
    doc.add_paragraph(
        "Email was separated into consented marketing and trusted transactional workflows. Both now use durable database state rather than assuming that a provider request and a later insert will succeed as one operation."
    )
    add_list(
        doc,
        [
            ("Transactional dispatcher", "Claims a dedupe key atomically, rejects disabled automation rules/suppressed recipients, sends with a stable provider idempotency key, and finalizes using a fencing token."),
            ("Resend webhook", "Verifies the raw signed payload and records sent, delivered, bounced, complained, failed, and suppressed states. Permanent bounces/complaints suppress future delivery."),
            ("Newsletter consent", "Creates a pending subscriber and token, sends a confirmation link, and activates only after confirmation. Exact normalized email matching replaces wildcard matching."),
            ("Unsubscribe semantics", "Link scanners and previews can safely GET the page; only the explicit POST confirmation mutates the subscription."),
            ("Campaigns", "Freeze content/audience through a recipient snapshot; use resumable batches and stable idempotency; test sends target allowlisted staff without contaminating subscriber records."),
            ("Scheduled delivery", "Weekly digest is bounded to 50 recipients per invocation. Listing reminders use the same claimed transactional path. All server links use validated `serverSiteOrigin`."),
        ],
    )
    add_callout(
        doc,
        "Operational requirement",
        "Production must configure `RESEND_API_KEY`, sender identities, `RESEND_WEBHOOK_SECRET`, and the expected delivery/bounce/complaint event subscriptions. The source review did not send live email.",
        color=AMBER,
    )

    add_section(doc, "7. Candidate privacy, portfolios, and public endpoints")
    add_list(
        doc,
        [
            ("Certificate storage", "Private objects are scoped to the candidate user path, constrained by MIME/size and a 20-certificate quota, and sanitized before portfolio exposure."),
            ("Application resumes", "Candidate snapshots and asset paths are derived from the authenticated profile. Recruiters receive a short-lived server-signed resume URL only for applications to their jobs."),
            ("Admin asset access", "Application-asset access includes the full server admin allowlist/role/disabled check; database role alone is insufficient."),
            ("Public portfolios", "A no-store API emits a sanitized projection and five-minute signed URLs for private certificate paths. Unsafe external resume/certificate links are discarded."),
            ("Job discovery", "The public view excludes disabled recruiters and expired/unpaid/unapproved jobs while redacting recruiter contact columns."),
            ("Share and OG endpoints", "Public slugs are bounded and rate limited. The server does not fetch attacker-selected logo/avatar URLs."),
            ("Sitemap", "Rows are paginated, capped at the protocol limit, read from the safe public view, and database failures are surfaced."),
        ],
    )

    add_section(doc, "8. Admin console redesign")
    doc.add_paragraph(
        "An admin panel already existed, so it was redesigned rather than duplicated. The visual and information architecture now matches Beonely's actual operator workflows instead of the inherited generic dashboard."
    )
    add_table(
        doc,
        ["Area", "Screens and operator purpose"],
        [
            ["Overview", "Server-backed marketplace snapshot, actionable counts, status cards, and clear query errors"],
            ["Marketplace", "Job moderation/editing, recruiter enable/disable controls, candidate lookup, and payment/revenue lifecycle"],
            ["Growth", "Hiring leads, campaign creation/detail, audience snapshots, and delivery progress"],
            ["Email", "Operational overview, analytics, templates, automations, campaign management, and test send"],
            ["Operations", "Consistent shell, workspace switching, settings access, account actions, responsive navigation"],
        ],
        [1800, 7560],
    )
    add_list(
        doc,
        [
            ("Server boundary", "Every cross-account query is made with a bearer token to `/api/admin/*`; the service role never enters the browser bundle."),
            ("Navigation", "Items are grouped by operator job, use descriptive labels/icons, and have route tests to prevent dead destinations."),
            ("Visual system", "Cards, compact status badges, metric hierarchy, tables, restrained color, and responsive spacing replace generic template widgets."),
            ("State handling", "Queries display deliberate loading, empty, and error UI rather than silently treating failures as zero results."),
            ("Accessibility", "Semantic headings, focus-visible controls, descriptive actions, mobile sheet title/description, and no duplicate close button."),
            ("Safety", "Job/recruiter mutations use optimistic concurrency, business preconditions, and audit records for high-risk account/moderation actions."),
        ],
    )

    add_section(doc, "9. Database migration ledger")
    migrations = [
        ["20260710010000", "core_security_hardening", "Auth/RLS, consent, application/payment integrity"],
        ["20260710020000", "payment_fulfillment", "Atomic Razorpay fulfillment and identifiers"],
        ["20260710030000", "campaign_delivery_hardening", "Recipient snapshots and delivery idempotency"],
        ["20260710040000", "admin_audit_log", "Privileged action evidence"],
        ["20260710120000", "api_rate_limits", "Atomic abuse-budget claims"],
        ["20260710130000", "resend_webhook_delivery", "Provider delivery state and event dedupe"],
        ["20260710140000", "admin_dashboard_stats", "Exact server admin aggregates"],
        ["20260710150000", "newsletter_double_opt_in", "Confirmation-token consent"],
        ["20260710160000", "storage_and_portfolio_hardening", "Owner paths, quotas, sanitized portfolios"],
        ["20260710170000", "public_job_projection", "Redacted live job view and safe application target"],
        ["20260710190000", "email_delivery_claims_and_suppression", "Claim/fence/finalize and suppression"],
        ["20260710200000", "private_candidate_assets", "Private certificates/resumes and trusted snapshots"],
        ["20260710210000", "admin_api_boundary", "Immutable browser fields and server-only mutations"],
        ["20260710220000", "payment_lifecycle_hardening", "Checkout snapshots, lifecycle, net revenue, review queue"],
        ["20260710300000", "final_access_boundary", "Owner-only browser reads and service-only admin aggregates"],
    ]
    add_table(
        doc,
        ["Timestamp", "Migration", "Purpose"],
        migrations,
        [1800, 3300, 4260],
        font_size=8.8,
    )
    add_callout(
        doc,
        "Migration caution",
        "Supabase Preview clean replay failed at statement 10 of `20260512120000_candidate_saved_applications_storage.sql`: relation `public.job_seeker_profiles` does not exist. The historical May chain is not a supported bootstrap. Existing projects must back up and reconcile the remote migration ledger—especially duplicated version `20260519120000`—before staging the July forward chain. New environments require a separately reviewed squashed/bootstrap baseline.",
        color=AMBER,
    )

    add_section(doc, "10. Verification and evidence")
    add_table(
        doc,
        ["Gate", "Result", "What it covered"],
        [
            ["Application TypeScript", "Pass", "React routes, features, providers, generated route integration"],
            ["API TypeScript", "Pass", "Vercel handlers, provider clients, RPC types, tests"],
            ["ESLint", "Pass (0 errors / 23 warnings)", "Fast-refresh notices are nonblocking module-organization warnings"],
            ["Prettier", "Pass", "All matched repository files; 299 inherited out-of-policy files normalized during the final pass"],
            ["API Vitest", "33 files / 108 tests", "Auth, rate limits, cron, payments, webhooks, email, consent, portfolio, sitemap helpers"],
            ["Browser Vitest", "59 files / 285 tests", "Components, forms, auth flows, jobs, admin navigation, state handling"],
            ["Responsive Playwright", "22 pass / 2 expected skips", "Desktop, iPhone SE, iPhone 14; overflow, menu, CTA, route smoke"],
            ["Production build", "Pass", "Vite production output plus TypeScript build"],
            ["Knip", "Pass", "No unused files or dependencies"],
            ["pnpm audit --prod", "Pass", "No known production dependency vulnerabilities"],
            ["Local built-browser smoke", "Pass", "Home, hiring, auth, legal, changelog, unsubscribe, 404, fail-closed admin, post-fix console"],
            ["Diff hygiene", "Pass", "No whitespace errors; repository-wide Prettier check passes"],
            ["GitHub Quality / validate", "Pass (3m37s)", "All workflow steps succeeded for runtime code commit 925f6c8"],
            ["Vercel Preview", "Blocked before deployment", "Git author Zsw0rd lacks project/team access; no preview URL was created"],
            ["Supabase Preview", "Failed in legacy bootstrap", "`public.job_seeker_profiles` missing at statement 10 before the July chain"],
            ["Overall hosted preview", "Not runnable", "Vercel never deployed and Supabase schema replay did not reach the implementation migrations"],
        ],
        [2160, 1800, 5400],
        font_size=8.9,
    )
    add_labeled_paragraph(
        doc,
        "Production-only bug found during live inspection",
        "The first built-browser attempt produced a blank page because `AdminWorkspaceProvider` called router hooks while mounted outside `RouterProvider`. The provider was moved inside the root route component. The final disconnected production bundle rendered normally and `/admin` followed the explicit fail-closed Supabase setup redirect.",
    )
    add_labeled_paragraph(
        doc,
        "Responsive issues found during final testing",
        "A stale mobile link targeted a removed LinkedIn-only section, and a responsive assertion expected an old CTA. Navigation now targets the always-present `open-roles` anchor, the assertion tracks the current candidate CTA, and the mobile sheet has an accessible title/description with one close action.",
    )
    add_labeled_paragraph(
        doc,
        "Final browser fixes",
        "Vercel Analytics previously requested its Vercel-only script during a self-hosted production preview and produced a console parse error; it is now compiled in only for actual Vercel builds. Standalone authentication titles were also upgraded from generic text to semantic level-one headings. The rebuilt route smoke produced no new console warning/error.",
    )

    add_section(doc, "11. Session chronology", new_page=False)
    chronology = [
        ["1", "Inventory", "Mapped routes, features, APIs, migrations, dependencies, tests, and inherited template code."],
        ["2", "Threat review", "Traced browser/server/Supabase trust boundaries and ranked authorization, payment, email, privacy, and provider risks."],
        ["3", "Core schema", "Added cumulative hardening migrations for RLS, consent, fulfillment, campaigns, audit, rate limits, and webhooks."],
        ["4", "Admin UX", "Reorganized navigation and overview, added real marketplace/revenue/email operations, and standardized error/loading states."],
        ["5", "Public/privacy", "Introduced redacted jobs view, private asset APIs, portfolio sanitization, slug limits, URL restrictions, and sitemap pagination."],
        ["6", "Email", "Closed relay, added double opt-in, safe unsubscribe, delivery claims, suppression, resumable campaigns/digests/reminders."],
        ["7", "Payments", "Added immutable snapshots, reservation/recovery, signed event dedupe, atomic fulfillment, lifecycle accounting, manual review, Turnstile."],
        ["8", "Admin boundary", "Moved cross-account reads/mutations to allowlisted APIs and removed direct admin browser policies/RPC execution."],
        ["9", "Cleanup", "Deleted unused apps/chats/tasks/users/dashboard scaffolding, dead components/icons, obsolete dependencies, and stale routes."],
        ["10", "Automated QA", "Added/expanded security and regression tests, CI, Knip, typechecks, build, dependency audit, and diff checks."],
        ["11", "Local live QA", "Opened the production bundle, found/fixed provider placement blank page, verified public structure and guarded routing."],
        ["12", "Responsive QA", "Found/fixed stale section navigation and mobile dialog accessibility; verified three viewport projects."],
        ["13", "Formatting baseline", "Normalized 299 inherited source/config files and verified every matched repository file with Prettier."],
        ["14", "Documentation", "Created AGENTS.md, the exact agent.md compatibility entry point, severity audit, environment updates, deployment checklist, and this full-session Word report."],
        ["15", "Final payment audit", "Found/fixed three high-severity capture-persistence gaps for disabled recruiters, reused provider IDs, and closed/failed checkouts."],
        ["16", "Branch and preview QA", "Pushed the dedicated branch, opened draft PR #2 without merging, confirmed GitHub Quality at code commit 925f6c8, recorded both hosted blockers, and completed final browser polish."],
    ]
    add_table(
        doc,
        ["Phase", "Workstream", "What happened"],
        chronology,
        [720, 1800, 6840],
        font_size=8.8,
    )

    add_section(doc, "12. Deployment handoff", new_page=False)
    doc.add_paragraph(
        "The implementation is pushed on `codex/repository-hardening-admin-redesign` and draft PR #2 is open against `main`; no merge was performed. A runnable hosted preview was not produced because Vercel rejected the Git author before deployment and Supabase Preview failed in the historical May bootstrap. Use the following sequence to avoid running new server code against an old schema or accepting provider events before secrets and policies are ready."
    )
    add_list(
        doc,
        [
            "Create a database and Storage metadata backup.",
            "Grant Git author `Zsw0rd` access to the Vercel project/team, then redeploy the branch preview.",
            "For an existing Supabase project, pull/reconcile the remote schema and migration ledger—especially duplicated version `20260519120000`—then apply the July forward chain through `20260710300000_final_access_boundary.sql` in staging.",
            "For a new Supabase project, create and review a squashed/bootstrap baseline; do not replay the current historical May chain unchanged.",
            "Test RLS with anonymous, candidate, recruiter, disabled recruiter, admin browser, and service-role sessions.",
            "Configure `SUPABASE_SERVICE_ROLE_KEY`, Razorpay credentials/webhook secret, Resend credentials/webhook secret, `CRON_SECRET`, admin allowlists, lead recipients, and the paired Turnstile keys.",
            "Subscribe Razorpay to the capture/order, failure, refund, and dispute lifecycle events supported by the handler; subscribe Resend to delivery, bounce, complaint, failure, and suppression events.",
            "Reconcile legacy payment rows and any captured rows requiring manual review before enabling live webhooks.",
            "Deploy API and frontend together after the staging schema passes.",
            "Smoke-test sign-up, application, private resume/certificate access, listing purchase, approval, renewal, boost, receipts, campaigns, confirmation, unsubscribe, cron, refund, dispute, and admin account controls.",
            "Monitor manual payment review, email suppression, cron failures, provider retries, and `admin_audit_log` after rollout.",
        ],
        ordered=True,
    )
    add_callout(
        doc,
        "Not performed",
        "No merge to main, production migration, live payment/email/refund/dispute, or provider/webhook configuration change was made. The dedicated branch was committed and pushed and draft PR #2 opened. Vercel and Supabase checks did not produce a runnable environment for the documented external reasons.",
        color=AMBER,
    )

    add_section(doc, "Appendix A. Important commands and files", new_page=False)
    for command in [
        "corepack pnpm lint",
        "corepack pnpm exec tsc --noEmit",
        "corepack pnpm typecheck:api",
        "corepack pnpm exec vitest run -c vitest.api.config.ts",
        "corepack pnpm exec vitest run --browser.headless",
        "corepack pnpm test:responsive",
        "corepack pnpm build",
        "corepack pnpm format:check",
        "corepack pnpm exec knip --include files --include dependencies",
        "corepack pnpm audit --prod",
        "git diff --check",
    ]:
        add_code_line(doc, command)

    add_table(
        doc,
        ["Artifact", "Purpose"],
        [
            ["AGENTS.md", "Durable repository architecture, workflow, and security invariants"],
            ["agent.md", "Exact requested compatibility entry point to the canonical AGENTS.md guide"],
            ["docs/SECURITY_AUDIT.md", "Severity-ranked finding and remediation register"],
            ["docs/vercel-environment.md", "Production environment, provider, cron, and smoke-test configuration"],
            ["supabase/migrations/20260710*.sql", "Cumulative forward security/data-policy changes"],
            ["api/_lib/payment-fulfillment.ts", "Shared replay-safe provider verification and fulfillment"],
            ["api/_lib/dispatch-transactional-email.ts", "Claimed transactional delivery dispatcher"],
            ["api/admin/[...segments].ts", "Explicit privileged admin API router"],
            ["src/features/admin/admin-app-shell.tsx", "Modernized admin shell and navigation frame"],
            ["vercel.json", "Functions, rewrites, cron schedules, redirects, and security headers"],
        ],
        [3240, 6120],
        font_size=9,
    )

    add_section(doc, "Appendix B. Review limitations")
    add_list(
        doc,
        [
            "The local environment did not have a running Supabase/PostgreSQL database, Supabase CLI, psql, or Docker database. The automatic remote Supabase Preview did execute and failed in the legacy May migration chain before the July hardening migrations.",
            "No production or staging credentials were used or exposed in the report.",
            "Vercel rejected deployment before build because Git author `Zsw0rd` lacked project/team access, so no hosted preview URL existed for browser validation.",
            "Provider behavior was exercised through signed fixtures, mocks, REST parsing tests, and source review. Real Razorpay/Resend staging events remain required.",
            "The admin shell was reviewed through source, route/component tests, and authentication redirect behavior. Full populated-data visual QA requires a signed-in staging admin account.",
            "Dependency advisory results are time-sensitive and must continue to run in CI.",
            "Forward policy changes do not retract asset URLs already copied elsewhere; audit any previously public Storage objects during rollout.",
        ],
    )
    add_callout(
        doc,
        "Final assessment",
        "No known source vulnerability was intentionally left open. Source/local tests and GitHub Quality pass, but the branch is not hosted-preview validated and PR checks remain non-green until Vercel access and the Supabase baseline are resolved.",
        color=AMBER,
    )

    remove_inline_backtick_markers(doc)
    return doc


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = build_document()
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
