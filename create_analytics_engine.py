# create_analytics_engine.py
"""
Script to create the triangulated analytics engine file in the correct location
"""

import os

# Create the engine directory if it doesn't exist
engine_dir = "app/engine" 
os.makedirs(engine_dir, exist_ok=True)

# Create __init__.py file
init_file = os.path.join(engine_dir, "__init__.py")
with open(init_file, "w", encoding='utf-8') as f:
    f.write("# Analytics engine module\n")

# Create the triangulated analytics engine file
analytics_content = '''"""
Triangulated Analytics Engine implementing the instruction set logic
for AI-based student profiling.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

class TriangulatedAnalyticsEngine:
    """
    Implementation of the triangulated profiling system as per instruction set
    """
    
    def __init__(self):
        # PASS thresholds as per instruction set
        self.pass_thresholds = {
            'strength': 65,  # >65 = Strength
            'balanced_min': 45,  # 45-65 = Balanced
            'at_risk': 45  # <45 = At Risk
        }
        
        # CAT4 SAS thresholds as per instruction set
        self.cat4_thresholds = {
            'strength': 110,  # SAS > 110 = Strength
            'balanced_min': 90,  # 90-110 = Balanced
            'weakness': 90  # <90 = Weakness
        }
        
        # Academic stanine thresholds as per instruction set
        self.academic_thresholds = {
            'strength': 7,  # 7-9 = Strength
            'balanced_min': 4,  # 4-6 = Balanced
            'weakness': 4  # 1-3 = Weakness
        }
        
        # P-number mapping for intervention strategies
        self.pass_p_mapping = {
            'Perceived Learning Capability': 'P1',
            'Confidence in Learning': 'P2', 
            'Self-regard as a Learner': 'P3',
            'Attitudes to Teachers': 'P4',
            'Response to Curriculum': 'P5',
            'General Work Ethic': 'P6',
            'Preparedness for Learning': 'P7',
            'Attitudes to Attendance': 'P8',
            'Feelings about School': 'P9'
        }

    def process_student_data(self, student_db, db: Session) -> Dict:
        """
        Process a student's complete data using triangulated profiling
        """
        result = {
            'student_id': student_db.student_id,
            'name': student_db.name,
            'grade': student_db.grade,
            'section': student_db.section,
            'pass_analysis': {'available': False},
            'cat4_analysis': {'available': False},
            'academic_analysis': {'available': False},
            'triangulated_summary': {},
            'interventions': [],
            'is_fragile_learner': False
        }
        
        # Process PASS data
        if student_db.pass_assessment:
            result['pass_analysis'] = self._analyze_pass_data(student_db.pass_assessment)
        
        # Process CAT4 data
        if student_db.cat4_assessment:
            result['cat4_analysis'] = self._analyze_cat4_data(student_db.cat4_assessment)
        
        # Process Academic data
        if student_db.academic_assessments:
            result['academic_analysis'] = self._analyze_academic_data(student_db.academic_assessments[0])
        
        # Generate triangulated summary
        result['triangulated_summary'] = self._generate_triangulated_summary(
            result['pass_analysis'],
            result['cat4_analysis'], 
            result['academic_analysis']
        )
        
        # Determine fragile learner status
        result['is_fragile_learner'] = self._determine_fragile_learner(result['cat4_analysis'])
        
        # Generate interventions
        result['interventions'] = self._generate_interventions(
            result['pass_analysis'],
            result['cat4_analysis'],
            result['academic_analysis'],
            result['is_fragile_learner']
        )
        
        return result

    def _analyze_pass_data(self, pass_assessment) -> Dict:
        """PASS Domain Classification as per instruction set"""
        if not pass_assessment.factors:
            return {'available': False}
        
        factors = []
        risk_areas = []
        strength_areas = []
        
        for factor in pass_assessment.factors:
            percentile = factor.percentile
            
            # Classification as per instruction set
            if percentile >= self.pass_thresholds['strength']:
                level = 'strength'
                strength_areas.append({
                    'factor': factor.name,
                    'percentile': percentile,
                    'level': 'strength'
                })
            elif percentile >= self.pass_thresholds['balanced_min']:
                level = 'balanced'
            else:
                level = 'at-risk'
                risk_areas.append({
                    'factor': factor.name,
                    'percentile': percentile,
                    'level': 'at-risk'
                })
            
            factors.append({
                'name': factor.name,
                'percentile': percentile,
                'level': level,
                'p_number': self.pass_p_mapping.get(factor.name, 'Unknown')
            })
        
        return {
            'available': True,
            'factors': factors,
            'riskAreas': risk_areas,
            'strengthAreas': strength_areas,
            'overallStatus': self._calculate_pass_overall_status(risk_areas, strength_areas)
        }

    def _analyze_cat4_data(self, cat4_assessment) -> Dict:
        """CAT4 Classification as per instruction set"""
        if not cat4_assessment.domains:
            return {'available': False}
        
        domains = []
        weakness_areas = []
        strength_areas = []
        fragile_flags = 0
        
        for domain in cat4_assessment.domains:
            # Convert stanine to SAS for proper comparison
            sas = self._stanine_to_sas(domain.stanine)
            
            # Classification as per instruction set
            if sas > self.cat4_thresholds['strength']:
                level = 'strength'
                strength_areas.append({
                    'domain': domain.name,
                    'sas': sas,
                    'stanine': domain.stanine,
                    'level': 'strength'
                })
            elif sas >= self.cat4_thresholds['balanced_min']:
                level = 'balanced'
            else:
                level = 'weakness'
                weakness_areas.append({
                    'domain': domain.name,
                    'sas': sas,
                    'stanine': domain.stanine,
                    'level': 'weakness'
                })
                fragile_flags += 1
            
            domains.append({
                'name': domain.name,
                'stanine': domain.stanine,
                'sas': sas,
                'level': level
            })
        
        # Fragile learner determination as per instruction set
        is_fragile_learner = fragile_flags >= 2
        
        return {
            'available': True,
            'domains': domains,
            'weaknessAreas': weakness_areas,
            'strengthAreas': strength_areas,
            'is_fragile_learner': is_fragile_learner,
            'fragile_flags': fragile_flags
        }

    def _analyze_academic_data(self, academic_assessment) -> Dict:
        """Academic Subject Analysis as per instruction set"""
        if not academic_assessment.subjects:
            return {'available': False}
        
        subjects = []
        weakness_areas = []
        strength_areas = []
        
        for subject in academic_assessment.subjects:
            stanine = subject.internal_stanine
            
            # Classification as per instruction set
            if stanine >= self.academic_thresholds['strength']:
                level = 'strength'
                strength_areas.append({
                    'subject': subject.name,
                    'stanine': stanine,
                    'level': 'strength'
                })
            elif stanine >= self.academic_thresholds['balanced_min']:
                level = 'balanced'
            else:
                level = 'weakness'
                weakness_areas.append({
                    'subject': subject.name,
                    'stanine': stanine,
                    'level': 'weakness'
                })
            
            subjects.append({
                'name': subject.name,
                'stanine': stanine,
                'marks': getattr(subject, 'internal_marks', None),
                'level': level,
                'comparison': getattr(subject, 'comparison', '')
            })
        
        return {
            'available': True,
            'subjects': subjects,
            'weaknessAreas': weakness_areas,
            'strengthAreas': strength_areas,
            'averageStanine': np.mean([s['stanine'] for s in subjects])
        }

    def _generate_triangulated_summary(self, pass_analysis: Dict, cat4_analysis: Dict, academic_analysis: Dict) -> Dict:
        """Triangulated Summary Construction as per instruction set"""
        top_strengths = []
        top_weaknesses = []
        
        # Collect strengths and weaknesses from all domains
        if pass_analysis.get('available'):
            for strength in pass_analysis.get('strengthAreas', []):
                top_strengths.append({
                    'domain': 'PASS',
                    'factor': strength['factor'],
                    'score': strength['percentile'],
                    'type': 'Attitudinal Strength'
                })
            for risk in pass_analysis.get('riskAreas', []):
                top_weaknesses.append({
                    'domain': 'PASS',
                    'factor': risk['factor'],
                    'score': risk['percentile'],
                    'type': 'Attitudinal Risk'
                })
        
        if cat4_analysis.get('available'):
            for strength in cat4_analysis.get('strengthAreas', []):
                top_strengths.append({
                    'domain': 'CAT4',
                    'factor': strength['domain'],
                    'score': strength['sas'],
                    'type': 'Cognitive Strength'
                })
            for weakness in cat4_analysis.get('weaknessAreas', []):
                top_weaknesses.append({
                    'domain': 'CAT4',
                    'factor': weakness['domain'],
                    'score': weakness['sas'],
                    'type': 'Cognitive Weakness'
                })
        
        if academic_analysis.get('available'):
            for strength in academic_analysis.get('strengthAreas', []):
                top_strengths.append({
                    'domain': 'Academic',
                    'factor': strength['subject'],
                    'score': strength['stanine'],
                    'type': 'Academic Strength'
                })
            for weakness in academic_analysis.get('weaknessAreas', []):
                top_weaknesses.append({
                    'domain': 'Academic',
                    'factor': weakness['subject'],
                    'score': weakness['stanine'],
                    'type': 'Academic Weakness'
                })
        
        return {
            'top_strengths': sorted(top_strengths, key=lambda x: x['score'], reverse=True)[:5],
            'top_weaknesses': sorted(top_weaknesses, key=lambda x: x['score'])[:5]
        }

    def _generate_interventions(self, pass_analysis: Dict, cat4_analysis: Dict, academic_analysis: Dict, is_fragile_learner: bool) -> List[Dict]:
        """Intervention Strategy Mapping as per instruction set"""
        interventions = []
        
        # PASS-based interventions
        if pass_analysis.get('available'):
            for risk in pass_analysis.get('riskAreas', []):
                factor_name = risk['factor']
                p_number = self.pass_p_mapping.get(factor_name, 'Unknown')
                
                if p_number in ['P3', 'P7']:
                    interventions.append({
                        'trigger': f'PASS {p_number} at risk',
                        'domain': 'emotional',
                        'intervention': 'Self-esteem/confidence building',
                        'priority': 'high',
                        'description': 'Implement confidence-building activities and positive reinforcement strategies'
                    })
                elif p_number in ['P4', 'P6']:
                    interventions.append({
                        'trigger': f'PASS {p_number} at risk',
                        'domain': 'behavioral',
                        'intervention': 'Time management / Organization skills',
                        'priority': 'high',
                        'description': 'Provide structured support for organization and work habits'
                    })
                elif p_number in ['P5', 'P8']:
                    interventions.append({
                        'trigger': f'PASS {p_number} at risk',
                        'domain': 'behavioral',
                        'intervention': 'Attendance and engagement mentoring',
                        'priority': 'high',
                        'description': 'Implement engagement strategies and attendance monitoring'
                    })
        
        # CAT4-based interventions
        if cat4_analysis.get('available'):
            for weakness in cat4_analysis.get('weaknessAreas', []):
                if weakness['domain'] == 'Verbal' and weakness['sas'] < 90:
                    interventions.append({
                        'trigger': 'CAT4 Verbal SAS < 90',
                        'domain': 'cognitive',
                        'intervention': 'Verbal reasoning / reading boosters',
                        'priority': 'high',
                        'description': 'Implement targeted verbal reasoning and reading comprehension support'
                    })
        
        # Fragile learner intervention
        if is_fragile_learner:
            interventions.append({
                'trigger': 'Fragile learner = Yes',
                'domain': 'holistic',
                'intervention': 'Holistic learning support',
                'priority': 'critical',
                'description': 'Comprehensive multi-domain support addressing cognitive and attitudinal factors'
            })
        
        # Academic subject-specific interventions
        if academic_analysis.get('available'):
            for weakness in academic_analysis.get('weaknessAreas', []):
                interventions.append({
                    'trigger': f'Academic subject = Weak ({weakness["subject"]})',
                    'domain': 'academic',
                    'intervention': f'Subject-specific booster modules - {weakness["subject"]}',
                    'priority': 'medium',
                    'description': f'Targeted support for {weakness["subject"]} to address foundational gaps'
                })
        
        return interventions

    def _determine_fragile_learner(self, cat4_analysis: Dict) -> bool:
        """Determine fragile learner status as per instruction set"""
        if not cat4_analysis.get('available'):
            return False
        return cat4_analysis.get('fragile_flags', 0) >= 2

    def _stanine_to_sas(self, stanine: float) -> float:
        """Convert stanine to SAS score for proper threshold comparison"""
        stanine_to_sas_map = {
            1: 74, 2: 81, 3: 88, 4: 96, 5: 103,
            6: 112, 7: 119, 8: 127, 9: 141
        }
        
        if stanine in stanine_to_sas_map:
            return stanine_to_sas_map[stanine]
        
        # Linear interpolation for decimal stanines
        lower = int(stanine)
        upper = lower + 1
        
        if lower < 1:
            return 74
        if upper > 9:
            return 141
        
        lower_sas = stanine_to_sas_map.get(lower, 74)
        upper_sas = stanine_to_sas_map.get(upper, 141)
        
        fraction = stanine - lower
        return lower_sas + (upper_sas - lower_sas) * fraction

    def _sas_to_stanine(self, sas: float) -> float:
        """Convert SAS to stanine score"""
        if sas <= 74: return 1
        elif sas <= 81: return 2
        elif sas <= 88: return 3
        elif sas <= 96: return 4
        elif sas <= 103: return 5
        elif sas <= 112: return 6
        elif sas <= 119: return 7
        elif sas <= 127: return 8
        else: return 9

    def _calculate_pass_overall_status(self, risk_areas: List, strength_areas: List) -> str:
        """Calculate overall PASS status"""
        if len(risk_areas) >= 3:
            return 'High Risk'
        elif len(risk_areas) >= 1:
            return 'Some Risk'
        elif len(strength_areas) >= 3:
            return 'Strong'
        else:
            return 'Balanced'
'''

analytics_file = os.path.join(engine_dir, "triangulated_analytics.py")
with open(analytics_file, "w", encoding='utf-8') as f:
    f.write(analytics_content)

print("✓ Created app/engine/triangulated_analytics.py")
print("✓ Created app/engine/__init__.py")
print("\nAnalytics engine files created successfully!")