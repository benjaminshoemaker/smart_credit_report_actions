
  # Next Best Action Web App

  This is a code bundle for Next Best Action Web App. The original project is available at https://www.figma.com/design/OVr0St4fL948ON2Wlv2yMw/Next-Best-Action-Web-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Python Credit Report Parser

  This repo includes a lightweight Python pipeline to parse consumer credit report PDFs (TransUnion, Experian, Equifax) into a normalized JSON model.

  ### Setup
  - Create a virtualenv (optional): `python3 -m venv .venv && source .venv/bin/activate`
  - Install deps for parsing + tests: `pip install -r requirements-dev.txt`

  ### CLI Usage
  - Summary view:
    - `python -m parse_any /path/to/report.pdf`
    - Prints: `bureau`, `pulled_on`, counts by kind, `utilization`, and a table of accounts with `Creditor | Kind | Status | Limit | Balance`.
  - Full JSON:
    - `python -m parse_any /path/to/report.pdf --json`
    - Prints the full `model_dump()` of the parsed report.

  Example (summary):
  ```
  bureau: experian
  pulled_on: None
  counts: installment=2, mortgage=1, revolving=7
  utilization: 0.13
  Creditor         | Kind      | Status  | Limit   | Balance
  -----------------+-----------+---------+---------+--------
  AMERICAN EXPRESS | revolving | current | $35,000 | $1,109
  DISCOVER BANK    | revolving | current | $18,000 | $3,245
  ...
  ```

  ### Programmatic API
  ```py
  from parse_any import parse_report, parse_report_json, UnknownFormatError

  try:
      report = parse_report("/path/to/report.pdf")      # Pydantic model
      data = parse_report_json("/path/to/report.pdf")   # dict
  except UnknownFormatError as e:
      print("Could not detect format:\n", e)
  ```

  Notes:
  - PDF text extraction prefers PyMuPDF (fitz), with a pdfminer.six fallback.
  - Parsers are resilient to page breaks, extra whitespace, and icon glyphs, and apply numeric sanity checks.
  
