import os
import json
import csv

def generate_json_report(analysis_data, output_path):
    """Generates JSON analysis report."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2)
    return output_path

def generate_csv_report(analysis_data, output_path):
    """Generates CSV analysis report of key metrics."""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Parameter", "Value", "Unit"])
        
        meta = analysis_data.get("metadata", {})
        params = analysis_data.get("parameters", {})
        cls = analysis_data.get("classification", {})
        demod = analysis_data.get("demodulation", {})
        bitData = analysis_data.get("bitstream", {})
        deint = analysis_data.get("deinterleaving", {})
        fec = analysis_data.get("fec", {})
        is_cw = bool(cls.get("cw_detected") or "CW" in str(cls.get("modulation", "")).upper())
        is_norm = bool(params.get("is_normalized_freq") or not meta.get("sample_rate"))

        writer.writerow(["File Name", meta.get("file_name", "N/A"), ""])
        writer.writerow(["Format", meta.get("format", "N/A"), ""])
        writer.writerow(["Duration", meta.get("duration", 0.0), "seconds"])
        writer.writerow(["Sample Rate", meta.get("sample_rate", "N/A") if not is_norm else "Not provided", ""])
        
        writer.writerow(["Signal Power", f"{params.get('signal_power_db', 0.0)} dB", ""])
        writer.writerow(["Noise Power", f"{params.get('noise_power_db', 0.0)} dB", ""])
        writer.writerow(["SNR", params.get("snr_display") or f"{params.get('snr_db', 0.0)} dB", ""])
        
        cf_val = params.get("center_frequency", params.get("peak_frequency", 0.0))
        cf_str = f"{cf_val:+.4f} normalized" if is_norm else f"{cf_val} Hz"
        writer.writerow(["Center Frequency", cf_str, ""])
        writer.writerow(["Occupied Bandwidth", f"{params.get('occupied_bandwidth', 0.0)} {'normalized' if is_norm else 'Hz'}", ""])
        
        writer.writerow(["Detected Modulation", cls.get("modulation", "Unknown"), ""])
        writer.writerow(["Confidence", f"{cls.get('confidence', 0.0)}%", ""])
        
        writer.writerow(["Preamble", bitData.get("preamble_status", "Not analyzed"), ""])
        writer.writerow(["Header", bitData.get("header_status", "Not analyzed"), ""])
        writer.writerow(["Payload", bitData.get("payload_status", "Not analyzed"), ""])
        writer.writerow(["CRC", bitData.get("crc_status", "Not analyzed"), ""])
        
        writer.writerow(["Total Bits", "Not analyzed" if is_cw or not demod.get("num_bits") else demod.get("num_bits"), ""])
        writer.writerow(["De-interleaving", "Not applied" if is_cw else deint.get("method", "Not applied"), ""])
        writer.writerow(["FEC Scheme", "Not applied" if is_cw else fec.get("fec_scheme", "Not applied"), ""])
        writer.writerow(["Estimated BER", "Not available" if is_cw else str(demod.get("estimated_ber", "N/A")), ""])
        
    return output_path

def generate_pdf_report(analysis_data, output_path):
    """
    Generates a PDF analysis report using ReportLab if installed,
    or falls back to clean formatted HTML/Text report.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Custom dark cyber PDF theme
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#060B16'),
            spaceAfter=12
        )
        
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor('#3B82F6'),
            spaceBefore=10,
            spaceAfter=6
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#1F2937'),
            spaceAfter=4
        )
        
        elements = []
        elements.append(Paragraph("AI ASSISTED SIGNAL ANALYSIS REPORT", title_style))
        elements.append(Paragraph("SDR Intelligence Laboratory - Technical Telemetry", body_style))
        elements.append(Spacer(1, 12))
        
        meta = analysis_data.get("metadata", {})
        params = analysis_data.get("parameters", {})
        cls = analysis_data.get("classification", {})
        demod = analysis_data.get("demodulation", {})
        bitData = analysis_data.get("bitstream", {})
        deint = analysis_data.get("deinterleaving", {})
        fec = analysis_data.get("fec", {})
        is_cw = bool(cls.get("cw_detected") or "CW" in str(cls.get("modulation", "")).upper())
        is_norm = bool(params.get("is_normalized_freq") or not meta.get("sample_rate"))

        cf_val = params.get("center_frequency", params.get("peak_frequency", 0.0))
        cf_str = f"{cf_val:+.4f} normalized" if is_norm else f"{cf_val} Hz"
        
        table_data = [
            ["Parameter", "Value"],
            ["File Name", str(meta.get("file_name", "N/A"))],
            ["File Size", f"{meta.get('file_size', 0) / 1024:.2f} KB"],
            ["Sample Rate", f"{meta.get('sample_rate', 'Not provided')}" if not is_norm else "Not provided"],
            ["Duration", f"{meta.get('duration', 0.0)} s"],
            ["Signal Power", f"{params.get('signal_power_db', 0.0)} dB"],
            ["Noise Floor", f"{params.get('noise_power_db', 0.0)} dB"],
            ["SNR", str(params.get("snr_display") or f"{params.get('snr_db', 0.0)} dB")],
            ["Center Frequency", cf_str],
            ["Occupied Bandwidth", f"{params.get('occupied_bandwidth', 0.0)} {'normalized' if is_norm else 'Hz'}"],
            ["Detected Modulation", str(cls.get("modulation", "Unknown"))],
            ["Confidence Score", f"{cls.get('confidence', 0.0)}%"],
            ["Preamble", str(bitData.get("preamble_status", "Not analyzed"))],
            ["Header", str(bitData.get("header_status", "Not analyzed"))],
            ["Payload", str(bitData.get("payload_status", "Not analyzed"))],
            ["CRC", str(bitData.get("crc_status", "Not analyzed"))],
            ["Total Bits", "Not analyzed" if is_cw or not demod.get("num_bits") else str(demod.get("num_bits"))],
            ["De-interleaving", "Not applied" if is_cw else str(deint.get("method", "Not applied"))],
            ["FEC Scheme", "Not applied" if is_cw else str(fec.get("fec_scheme", "Not applied"))],
            ["Estimated BER", "Not available" if is_cw else str(demod.get("estimated_ber", "N/A"))]
        ]
        
        t = Table(table_data, colWidths=[200, 250])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0E1726')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#22D3EE')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ]))
        
        elements.append(t)
        elements.append(Spacer(1, 16))
        
        # Bitstream snippet
        bits_preview = demod.get("bits", "")[:128]
        elements.append(Paragraph("Recovered Bitstream Preview (First 128 Bits):", subtitle_style))
        elements.append(Paragraph(f"<code>{bits_preview}</code>", body_style))
        
        doc.build(elements)
        return output_path
        
    except Exception as e:
        # Fallback text/json report if reportlab is absent
        txt_path = output_path.replace(".pdf", ".txt")
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(analysis_data, indent=2))
        return txt_path
