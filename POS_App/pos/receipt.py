"""
pos/receipt.py — PDF receipt generator using ReportLab. REQ-28.
Header: "AKLI shopping manager" branding.
Includes itemized lines, tax per item, subtotal, and total.
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas


def generate_receipt(transaction_id: int, user_name: str, items: list, output_dir: str = None) -> str:
    """
    Generate a PDF receipt.

    Args:
        transaction_id: ID of the transaction.
        user_name: Name of the cashier.
        items: List of dicts: {name, quantity, unit_price, tax_rate, line_total, tax_amount}
        output_dir: Where to save the PDF. Defaults to receipts/ subfolder.

    Returns:
        Path to the generated PDF.
    """
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'receipts')
    os.makedirs(output_dir, exist_ok=True)

    filename = f"receipt_{transaction_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(output_dir, filename)

    c = pdfcanvas.Canvas(filepath, pagesize=A6)
    width, height = A6
    y = height - 10 * mm

    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2, y, "AKLI shopping manager")
    y -= 6 * mm

    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, y, f"Receipt #{transaction_id}  |  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    y -= 4 * mm
    c.drawCentredString(width / 2, y, f"Cashier: {user_name}")
    y -= 5 * mm

    # Divider
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm

    # Column headers
    c.setFont("Helvetica-Bold", 8)
    c.drawString(5 * mm, y, "Item")
    c.drawRightString(width - 35 * mm, y, "Qty")
    c.drawRightString(width - 20 * mm, y, "Price")
    c.drawRightString(width - 5 * mm, y, "Total")
    y -= 4 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm

    # Items
    subtotal = 0.0
    total_tax = 0.0
    c.setFont("Helvetica", 8)
    for item in items:
        name = item['name'][:22]
        qty = item['quantity']
        unit_price = float(item['unit_price'])
        tax_rate = float(item.get('tax_rate', 0))
        line_total = float(item.get('line_total', unit_price * qty))
        tax_amount = float(item.get('tax_amount', 0))

        c.drawString(5 * mm, y, name)
        c.drawRightString(width - 35 * mm, y, str(qty))
        c.drawRightString(width - 20 * mm, y, f"{unit_price:.2f}")
        c.drawRightString(width - 5 * mm, y, f"{line_total:.2f}")
        y -= 4 * mm

        if tax_rate > 0:
            c.setFont("Helvetica-Oblique", 7)
            c.setFillColorRGB(0.4, 0.4, 0.4)
            c.drawString(7 * mm, y, f"  Tax ({tax_rate}%): {tax_amount:.2f} DA")
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica", 8)
            y -= 4 * mm

        subtotal += line_total
        total_tax += tax_amount

    # Totals
    y -= 2 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 9)
    c.drawString(5 * mm, y, "Subtotal:")
    c.drawRightString(width - 5 * mm, y, f"{subtotal:.2f} DA")
    y -= 5 * mm
    c.drawString(5 * mm, y, "Tax Collected:")
    c.drawRightString(width - 5 * mm, y, f"{total_tax:.2f} DA")
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(5 * mm, y, "TOTAL:")
    c.drawRightString(width - 5 * mm, y, f"{subtotal:.2f} DA")
    y -= 8 * mm

    # Footer
    c.setFont("Helvetica", 7)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawCentredString(width / 2, y, "Thank you for shopping at AKLI!")
    c.drawCentredString(width / 2, y - 4 * mm, "All sales final unless accompanied by receipt.")

    c.save()
    return filepath
