# PDF generation 
from fpdf import FPDF
import matplotlib.pyplot as plt
import io

class StudentReportGenerator:
    def __init__(self, school_logo=None):
        self.school_logo = school_logo
        
    def generate_student_report(self, student_data, analysis_results):
        pdf = FPDF()
        pdf.add_page()
        
        # Add header and student info
        self._add_header(pdf, student_data)
        
        # Add PASS radar chart
        self._add_pass_visualization(pdf, analysis_results['pass_analysis'])
        
        # Add CAT4 analysis
        self._add_cat4_section(pdf, analysis_results['cat4_analysis'])
        
        # Add academic performance analysis
        self._add_academic_section(pdf, analysis_results['academic_analysis'])
        
        # Add recommended interventions
        self._add_interventions_section(pdf, analysis_results['recommended_interventions'])
        
        return pdf.output(dest='S').encode('latin1')