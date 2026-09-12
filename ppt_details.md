# SIH 2026 Presentation Layout & Typography Specifications (`ppt_details.md`)

This document records the **exact dimensional, typography, padding, color, and geometric specifications** extracted directly from the official template file: `SIH2026-IDEA-Presentation-Format.pptx`.

---

## 1. Global Presentation Canvas Dimensions

* **Width:** `13.33 inches` (12,192,000 EMUs / 960 pt)
* **Height:** `7.50 inches` (6,858,000 EMUs / 540 pt)
* **Aspect Ratio:** `16:9` (Widescreen)
* **Master Layouts Base:**
  * Slide 1 uses: `slideLayout1.xml` (Title Slide Layout)
  * Slides 2–7 use: `slideLayout2.xml` (Title and Content Layout, inheriting from `slideMaster1.xml`)

---

## 2. Global Padding & Margins Standard

Across all standard text boxes and placeholder shapes in the template:
* **Left Padding (`lIns`):** `0.10 inches` (91,440 EMUs / 7.2 pt)
* **Right Padding (`rIns`):** `0.10 inches` (91,440 EMUs / 7.2 pt)
* **Top Padding (`tIns`):** `0.05 inches` (45,720 EMUs / 3.6 pt)
* **Bottom Padding (`bIns`):** `0.05 inches` (45,720 EMUs / 3.6 pt)
* **Default Vertical Anchor:** `top` (Titles and Content Textboxes)
* **Centered Vertical Anchor:** `ctr` (Team Name Ovals, Bottom Accent Bars)

---

## 3. Official Color Palette & Theme Codes

* **Primary SIH Accent Blue (Bottom Bar):** `#0070C0` (Solid Fill, `0.8 pt` outline)
* **Dark 1 / Primary Text:** `#000000` (`scheme:dk1` / System Black)
* **Dark 2 / Navy Heading Accent:** `#1F497D` (`scheme:tx2`)
* **Light 1 / Slide Canvas Background:** `#FFFFFF` (`scheme:bg1` / Solid White)
* **Instruction Alert Red:** `#C00000` (Used on Slide 7 warning text)
* **Footer Text White:** `#FFFFFF` (`scheme:bg1`)

---

## 4. Slide-by-Slide Exact Specifications

---

### Slide 1: Title Page

#### Geometry & Shapes:
1. **Background Canvas (`Rectangle 24`):**
   * Position: `Left: 1.67"`, `Top: 0.00"`, `Width: 10.00"`, `Height: 7.50"`
   * Fill: `None`, Line: `0.0 pt`
2. **Graphic Accent (`Freeform: Shape 26`):**
   * Position: `Left: 6.19"`, `Top: 0.93"`, `Width: 5.07"`, `Height: 5.64"`
   * Fill: `Solid scheme:tx1` (`#000000`), Line: `0.0 pt`

#### Text Boxes & Typography:
1. **Header Banner (`Title 7`):**
   * Position: `Left: 0.36"`, `Top: -0.58"`, `Width: 11.33"`, `Height: 2.27"`
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * Text: `"SMART INDIA HACKATHON 2026"`
   * Font: **`Garamond`**
   * Font Size: **`40.0 pt`**
   * Weight: **`Bold`**
   * Color: `scheme:tx2` (`#1F497D`)
   * Alignment: `Left`
2. **Page Label (`Subtitle 3`):**
   * Position: `Left: 1.36"`, `Top: 0.71"`, `Width: 9.33"`, `Height: 1.92"`
   * Text: `"TITLE PAGE"`
   * Font: **`Times New Roman`**
   * Font Size: **`44.0 pt`** (Master default)
   * Weight: **`Bold`**
   * Color: `scheme:tx1` (`#000000`)
   * Alignment: `Left`
3. **Problem & Team Details Box (`TextBox 9`):**
   * Position: `Left: 0.36"`, `Top: 2.27"`, `Width: 6.48"`, `Height: 5.14"`
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * Font: **`Arial`**
   * Font Size: **`24.0 pt`**
   * Weight: **`Bold`**
   * Color: `#000000` (Default dark)
   * Alignment: `Justify`
   * Paragraph Spacing: `Space After: 0 pt`, `Line Spacing: 100%`
   * Labels included:
     * `Problem Statement ID –`
     * `Problem Statement Title-`
     * `Theme-`
     * `PS Category- Software/Hardware`
     * `Team ID-`
     * `Team Name (Registered on portal)`

---

### Slide 2: IDEA TITLE & Proposed Solution

#### Fixed Template Elements:
* **Bottom Accent Bar (`Rectangle 8`):**
  * Position: `Left: 0.00"`, `Top: 6.95"`, `Width: 13.33"`, `Height: 0.55"`
  * Fill: `Solid #0070C0`, Line: `0.8 pt`
* **Footer Text (`Footer Placeholder 6`):**
  * Position: `Left: 5.08"`, `Top: 6.95"`, `Width: 3.50"`, `Height: 0.40"`
  * Text: `"@SIH Idea submission- Template"`
  * Font: **`TradeGothic`** / `Calibri`
  * Font Size: **`12.0 pt`**
  * Weight: `Regular`
  * Color: `scheme:bg1` (`#FFFFFF`)
  * Alignment: `Center`
* **Slide Number Placeholder (`Slide Number Placeholder 5`):**
  * Position: `Left: 9.56"`, `Top: 6.95"`, `Width: 3.11"`, `Height: 0.40"`
  * Font Size: **`12.0 pt`**, Alignment: `Right`
* **Team Name Badge (`Oval 9`):**
  * Position: `Left: 0.36"`, `Top: 0.28"`, `Width: 1.37"`, `Height: 0.88"`
  * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `ctr`
  * Text: `"Your Team Name"`
  * Font: **`Calibri`** / `TradeGothic`, Font Size: **`18.0 pt`**, Alignment: `Center`

#### Content Elements:
1. **Slide Title (`Title 1`):**
   * Position: `Left: 0.20"`, `Top: 0.00"`, `Width: 12.00"`, `Height: 1.25"`
   * Text: `"IDEA TITLE"`
   * Font: **`Times New Roman`**
   * Font Size: **`36.0 pt`**
   * Weight: **`Bold`**
   * Alignment: `Left`
2. **Content Box (`TextBox 8`):**
   * Position: `Left: 0.00"`, `Top: 2.26"`, `Width: 13.33"`, `Height: 2.73"`
   * Border Line: `0.8 pt` solid stroke
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * **Sub-Header:**
     * Text: `"Proposed Solution (Describe your Idea/Solution/Prototype)"`
     * Font: **`Arial`**
     * Font Size: **`32.0 pt`**
     * Weight: **`Bold`**
     * Color: `scheme:tx2` (`#1F497D`)
     * Alignment: `Left`
   * **Core Bullet Pointers:**
     * Pointers:
       * `Detailed explanation of the proposed solution`
       * `How it addresses the problem`
       * `Innovation and uniqueness of the solution`
     * Font: **`Arial`**
     * Font Size: **`28.0 pt`**
     * Weight: `Regular`
     * Color: `#000000`
     * Alignment: `Justify`

---

### Slide 3: TECHNICAL APPROACH

#### Fixed Elements:
* **Bottom Accent Bar (`Rectangle 9`):** `Left: 0.00"`, `Top: 6.95"`, `Width: 13.33"`, `Height: 0.55"`, Fill: `Solid #0070C0`
* **Footer (`Footer Placeholder 6`):** `Left: 5.08"`, `Top: 6.95"`, `Width: 3.50"`, `Height: 0.40"`, Font: `TradeGothic 12.0 pt White`
* **Team Name Badge (`Oval 10`):** `Left: 0.36"`, `Top: 0.28"`, `Width: 1.37"`, `Height: 0.88"`, Anchor: `ctr`

#### Content Elements:
1. **Slide Title (`Title 1` - Inherited from Master):**
   * Position: `Left: 0.67"`, `Top: -0.05"`, `Width: 12.00"`, `Height: 1.25"`
   * Text: `"TECHNICAL APPROACH"`
   * Font: **`Times New Roman`**
   * Font Size: **`36.0 pt`**
   * Weight: **`Bold`**
   * Alignment: `Left`
2. **Content Box (`TextBox 8`):**
   * Position: `Left: 0.67"`, `Top: 2.77"`, `Width: 10.26"`, `Height: 1.99"`
   * Border Line: `0.8 pt` solid stroke
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * **Core Bullet Pointers:**
     * Pointers:
       * `Technologies to be used (e.g. programming languages, frameworks, hardware)`
       * `Methodology and process for implementation (Flow Charts/Images/ working prototype)`
     * Font: **`Arial`**
     * Font Size: **`28.0 pt`**
     * Weight: `Regular`
     * Color: `#000000`
     * Alignment: `Justify`

---

### Slide 4: FEASIBILITY AND VIABILITY

#### Fixed Elements:
* **Bottom Accent Bar (`Rectangle 9`):** `Left: 0.00"`, `Top: 6.95"`, `Width: 13.33"`, `Height: 0.55"`, Fill: `Solid #0070C0`
* **Footer (`Footer Placeholder 6`):** `Left: 5.08"`, `Top: 6.95"`, `Width: 3.50"`, `Height: 0.40"`, Font: `TradeGothic 12.0 pt White`
* **Team Name Badge (`Oval 11`):** `Left: 0.36"`, `Top: 0.28"`, `Width: 1.37"`, `Height: 0.88"`, Anchor: `ctr`

#### Content Elements:
1. **Slide Title (`Title 1`):**
   * Position: `Left: 0.67"`, `Top: -0.05"`, `Width: 12.00"`, `Height: 1.25"`
   * Text: `"FEASIBILITY AND VIABILITY"`
   * Font: **`Times New Roman`**
   * Font Size: **`36.0 pt`**
   * Weight: **`Bold`**
   * Alignment: `Left`
2. **Content Box (`TextBox 8`):**
   * Position: `Left: 0.67"`, `Top: 2.77"`, `Width: 10.26"`, `Height: 1.51"`
   * Border Line: `0.8 pt` solid stroke
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * **Core Bullet Pointers:**
     * Pointers:
       * `Analysis of the feasibility of the idea`
       * `Potential challenges and risks`
       * `Strategies for overcoming these challenges`
     * Font: **`Arial`**
     * Font Size: **`28.0 pt`**
     * Weight: `Regular`
     * Color: `#000000`
     * Alignment: `Justify`

---

### Slide 5: IMPACT AND BENEFITS

#### Fixed Elements:
* **Bottom Accent Bar (`Rectangle 9`):** `Left: 0.00"`, `Top: 6.95"`, `Width: 13.33"`, `Height: 0.55"`, Fill: `Solid #0070C0`
* **Footer (`Footer Placeholder 6`):** `Left: 5.08"`, `Top: 6.95"`, `Width: 3.50"`, `Height: 0.40"`, Font: `TradeGothic 12.0 pt White`
* **Team Name Badge (`Oval 11`):** `Left: 0.36"`, `Top: 0.28"`, `Width: 1.37"`, `Height: 0.88"`, Anchor: `ctr`

#### Content Elements:
1. **Slide Title (`Title 1`):**
   * Position: `Left: 0.67"`, `Top: -0.05"`, `Width: 12.00"`, `Height: 1.25"`
   * Text: `"IMPACT AND BENEFITS"`
   * Font: **`Times New Roman`**
   * Font Size: **`36.0 pt`**
   * Weight: **`Bold`**
   * Alignment: `Left`
2. **Content Box (`TextBox 8`):**
   * Position: `Left: 0.67"`, `Top: 2.77"`, `Width: 10.26"`, `Height: 1.51"`
   * Border Line: `0.8 pt` solid stroke
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * **Core Bullet Pointers:**
     * Pointers:
       * `Potential impact on the target audience`
       * `Benefits of the solution (social, economic, environmental, etc.)`
     * Font: **`Arial`**
     * Font Size: **`28.0 pt`**
     * Weight: `Regular`
     * Color: `#000000`
     * Alignment: `Justify`

---

### Slide 6: RESEARCH AND REFERENCES

#### Fixed Elements:
* **Bottom Accent Bar (`Rectangle 9`):** `Left: 0.00"`, `Top: 6.95"`, `Width: 13.33"`, `Height: 0.55"`, Fill: `Solid #0070C0`
* **Footer (`Footer Placeholder 6`):** `Left: 5.08"`, `Top: 6.95"`, `Width: 3.50"`, `Height: 0.40"`, Font: `TradeGothic 12.0 pt White`
* **Team Name Badge (`Oval 8`):** `Left: 0.36"`, `Top: 0.28"`, `Width: 1.37"`, `Height: 0.88"`, Anchor: `ctr`

#### Content Elements:
1. **Slide Title (`Title 1`):**
   * Position: `Left: 0.67"`, `Top: -0.05"`, `Width: 12.00"`, `Height: 1.25"`
   * Text: `"RESEARCH  AND REFERENCES"`
   * Font: **`Times New Roman`**
   * Font Size: **`36.0 pt`**
   * Weight: **`Bold`**
   * Alignment: `Left`
2. **Content Box (`TextBox 8`):**
   * Position: `Left: 0.67"`, `Top: 3.06"`, `Width: 10.26"`, `Height: 0.57"`
   * Border Line: `0.8 pt` solid stroke
   * Padding: `L: 0.10"`, `R: 0.10"`, `T: 0.05"`, `B: 0.05"`, Anchor: `top`
   * **Core Bullet Pointers:**
     * Pointer:
       * `Details / Links of the reference and research work`
     * Font: **`Arial`**
     * Font Size: **`28.0 pt`**
     * Weight: `Regular`
     * Color: `#000000`
     * Alignment: `Justify`

---

### Slide 7: Important Instructions *(To be deleted before final PDF submission)*
* **Header (`TextBox 3`):** `Left: 1.52"`, `Top: 0.12"`, `Width: 9.20"`, `Height: 0.71"`, Font: `Times New Roman 36.0 pt Bold`, Center.
* **Banner Rectangle (`Round Diagonal Corner Rectangle 2`):** `Left: 0.00"`, `Top: 1.96"`, `Width: 13.33"`, `Height: 4.72"`, Fill: `scheme:accent1`, Line: `3.0 pt`.
* **Rules Text (`Google Shape;100;p3`):** `Left: 0.40"`, `Top: 2.09"`, `Width: 12.87"`, `Height: 4.45"`, Font: `Arial Bold`, Line spacing: `90%`. Maximum 6 slides rule emphasized in `#C00000`.

---

## 5. Summary Table for Quick Reference

| Element | Font Family | Size (pt) | Weight | Color | Alignment | Padding (L, R, T, B) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Slide Main Title (Slides 2–6)** | `Times New Roman` | `36.0 pt` | Bold | `#000000` | Left | `0.10", 0.10", 0.05", 0.05"` |
| **Slide 1 Header ("SMART INDIA...")** | `Garamond` | `40.0 pt` | Bold | `#1F497D` | Left | `0.10", 0.10", 0.05", 0.05"` |
| **Slide 1 Subtitle ("TITLE PAGE")** | `Times New Roman` | `44.0 pt` | Bold | `#000000` | Left | `0.10", 0.10", 0.05", 0.05"` |
| **Slide 1 Form Labels** | `Arial` | `24.0 pt` | Bold | `#000000` | Justify | `0.10", 0.10", 0.05", 0.05"` |
| **Slide 2 Section Header** | `Arial` | `32.0 pt` | Bold | `#1F497D` | Left | `0.10", 0.10", 0.05", 0.05"` |
| **Body Content / Pointers** | `Arial` | `28.0 pt` | Regular | `#000000` | Justify | `0.10", 0.10", 0.05", 0.05"` |
| **Team Name (Oval Badge)** | `Calibri` / `TradeGothic`| `18.0 pt` | Regular | `#000000` | Center | `0.10", 0.10", 0.05", 0.05"` |
| **Footer Template Tag** | `TradeGothic` | `12.0 pt` | Regular | `#FFFFFF` | Center | `0.10", 0.10", 0.05", 0.05"` |
| **Slide Number** | Default | `12.0 pt` | Regular | Default | Right | `0.10", 0.10", 0.05", 0.05"` |
