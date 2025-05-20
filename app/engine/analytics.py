import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.inspection import permutation_importance
from fpdf import FPDF
from datetime import datetime
import os
import seaborn as sns

# Add this to app/engine/analytics.py at the beginning, before the other classes

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sqlalchemy.orm import Session

class StudentAnalyticsEngine:
    """
    Comprehensive analytics engine for processing student data from PASS, CAT4, and internal assessments.
    Provides risk analysis, intervention recommendations, and generates detailed reports.
    """
    
    def __init__(self):
        """Initialize the analytics engine with default models and mappings"""
        # Pre-defined mappings for intervention strategies
        self._init_intervention_mappings()
        # Pre-defined PASS factor descriptions
        self._init_pass_descriptions()
        # Pre-defined CAT4 domain descriptions
        self._init_cat4_descriptions()
        # Initialize models
        self.pass_model = None
        self.academic_model = None
        
    def _init_intervention_mappings(self):
        """Initialize detailed intervention strategy mappings by domain and level"""
        # PASS-based emotional and behavioral interventions
        self.emotional_interventions = {
            'Self_Regard': {
                'At Risk': [
                    {
                        'title': 'Self-Esteem Building',
                        'description': 'Weekly sessions with counselor focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Success Portfolio',
                        'description': 'Create a digital or physical portfolio where student can document and reflect on achievements, no matter how small.',
                        'priority': 'medium'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Strength Recognition',
                        'description': 'Monthly check-in with advisor to acknowledge and reinforce positive self-image through specific examples.',
                        'priority': 'medium'
                    }
                ]
            },
            'Attitude_Teachers': {
                'At Risk': [
                    {
                        'title': 'Teacher-Student Mediation',
                        'description': 'Facilitated discussion between student and teachers to address concerns and establish mutual respect and understanding.',
                        'priority': 'high'
                    }
                ]
            },
            'General_Work_Ethic': {
                'At Risk': [
                    {
                        'title': 'Academic Coaching',
                        'description': 'Weekly sessions to develop organizational skills, time management, and task prioritization strategies.',
                        'priority': 'high'
                    }
                ]
            },
            'Emotional_Control': {
                'At Risk': [
                    {
                        'title': 'Emotional Regulation Therapy',
                        'description': 'Counselor-led sessions focused on identifying emotional triggers and developing healthy coping mechanisms.',
                        'priority': 'high'
                    }
                ]
            }
        }
        
        # CAT4 cognitive interventions
        self.cognitive_interventions = {
            'Verbal_Reasoning': {
                'Weakness': [
                    {
                        'title': 'Verbal Skills Development',
                        'description': 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
                        'priority': 'high'
                    }
                ]
            },
            'Quantitative_Reasoning': {
                'Weakness': [
                    {
                        'title': 'Numeracy Intervention',
                        'description': 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
                        'priority': 'high'
                    }
                ]
            },
            'Fragile_Learner': {
                'Yes': [
                    {
                        'title': 'Comprehensive Learning Support',
                        'description': 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
                        'priority': 'high'
                    }
                ]
            }
        }
        
        # Academic interventions based on subject performance
        self.academic_interventions = {
            'Weakness': [
                {
                    'title': 'Targeted Tutoring',
                    'description': 'Subject-specific tutoring focusing on foundational skills and knowledge gaps identified through assessment.',
                    'priority': 'high'
                }
            ]
        }
    
    def _init_pass_descriptions(self):
        """Initialize detailed descriptions for PASS factors"""
        self.pass_descriptions = {
            'Self_Regard': 'How positive a student feels about themselves as a learner and their ability to achieve. Low scores may indicate lack of confidence in learning abilities.',
            'Attitude_Teachers': 'How the student perceives their relationships with teachers. Low scores suggest potential conflict or disconnect with teaching staff.',
            'General_Work_Ethic': 'The student\'s approach to schoolwork and their sense of responsibility for their learning. Low scores indicate a lack of persistence and effort.',
            'Emotional_Control': 'The student\'s ability to manage their emotional response to setbacks and challenges. Low scores suggest difficulty regulating emotions in academic settings.',
            'Social_Confidence': 'How comfortable the student feels in social interactions with peers. Low scores indicate possible social anxiety or relationship challenges.',
            'Curriculum_Demand': 'The student\'s perception of whether they can cope with the learning demands placed on them. Low scores suggest feeling overwhelmed by curriculum requirements.'
        }
    
    def _init_cat4_descriptions(self):
        """Initialize detailed descriptions for CAT4 domains"""
        self.cat4_descriptions = {
            'Verbal_Reasoning': 'The ability to understand and analyze words, verbal concepts, and extract information from text. Essential for reading comprehension and language-based subjects.',
            'Quantitative_Reasoning': 'The ability to understand and solve problems using numbers and mathematical concepts. Central to success in mathematics and science.',
            'Nonverbal_Reasoning': 'The ability to analyze visual information and solve problems using patterns, relationships, and visual logic. Important for scientific thinking and abstract problem-solving.',
            'Spatial_Reasoning': 'The ability to manipulate shapes and understand spatial relationships in two and three dimensions. Valuable for design, engineering, architecture, and visual arts.'
        }
    
    def process_student(self, student_db):
        """Process a student from the database to generate analytics"""
        # Create a basic student data structure
        student_data = {
            'student_id': student_db.student_id,
            'name': student_db.name,
            'grade': student_db.grade,
            'is_fragile_learner': student_db.is_fragile_learner
        }
        
        # Add PASS analysis if available
        pass_assessment = self._get_pass_data(student_db)
        if pass_assessment:
            student_data['pass_analysis'] = {
                'available': True,
                'factors': self._format_pass_factors(pass_assessment),
                'riskAreas': self._identify_pass_risks(pass_assessment),
                'strengthAreas': []
            }
        else:
            student_data['pass_analysis'] = {'available': False}
        
        # Add CAT4 analysis if available
        cat4_assessment = self._get_cat4_data(student_db)
        if cat4_assessment:
            student_data['cat4_analysis'] = {
                'available': True,
                'domains': self._format_cat4_domains(cat4_assessment),
                'weaknessAreas': self._identify_cat4_weaknesses(cat4_assessment),
                'strengthAreas': [],
                'is_fragile_learner': student_db.is_fragile_learner
            }
        else:
            student_data['cat4_analysis'] = {'available': False}
        
        # Add academic analysis if available
        academic_assessments = self._get_academic_data(student_db)
        if academic_assessments:
            student_data['academic_analysis'] = {
                'available': True,
                'subjects': self._format_academic_subjects(academic_assessments)
            }
        else:
            student_data['academic_analysis'] = {'available': False}
        
        return student_data

    def _get_pass_data(self, student_db):
        """Get PASS data for a student from the database"""
        if hasattr(student_db, 'pass_assessment') and student_db.pass_assessment:
            return student_db.pass_assessment
        return None
    
    def _get_cat4_data(self, student_db):
        """Get CAT4 data for a student from the database"""
        if hasattr(student_db, 'cat4_assessment') and student_db.cat4_assessment:
            return student_db.cat4_assessment
        return None
    
    def _get_academic_data(self, student_db):
        """Get academic data for a student from the database"""
        if hasattr(student_db, 'academic_assessments') and student_db.academic_assessments:
            return student_db.academic_assessments
        return []
    
    def _format_pass_factors(self, pass_assessment):
        """Format PASS factors for the API response"""
        formatted_factors = []
        if pass_assessment and hasattr(pass_assessment, 'factors'):
            for factor in pass_assessment.factors:
                # Determine level based on percentile
                level = 'at-risk' if factor.percentile < 45 else 'strength' if factor.percentile >= 65 else 'balanced'
                
                formatted_factors.append({
                    'name': factor.name.replace('_', ' '),
                    'percentile': factor.percentile,
                    'level': level,
                    'description': self.pass_descriptions.get(factor.name, '')
                })
        return formatted_factors
    
    def _identify_pass_risks(self, pass_assessment):
        """Identify PASS risk areas"""
        risk_areas = []
        if pass_assessment and hasattr(pass_assessment, 'factors'):
            for factor in pass_assessment.factors:
                if factor.percentile < 45:  # At risk threshold
                    risk_areas.append({
                        'factor': factor.name.replace('_', ' '),
                        'percentile': factor.percentile,
                        'level': 'at-risk'
                    })
        return risk_areas
    
    def _format_cat4_domains(self, cat4_assessment):
        """Format CAT4 domains for the API response"""
        formatted_domains = []
        if cat4_assessment and hasattr(cat4_assessment, 'domains'):
            for domain in cat4_assessment.domains:
                # Determine level based on stanine
                level = 'weakness' if domain.stanine <= 3 else 'strength' if domain.stanine >= 7 else 'balanced'
                
                formatted_domains.append({
                    'name': domain.name.replace('_', ' '),
                    'stanine': domain.stanine,
                    'level': level,
                    'description': self.cat4_descriptions.get(domain.name, '')
                })
        return formatted_domains
    
    def _identify_cat4_weaknesses(self, cat4_assessment):
        """Identify CAT4 weakness areas"""
        weakness_areas = []
        if cat4_assessment and hasattr(cat4_assessment, 'domains'):
            for domain in cat4_assessment.domains:
                if domain.stanine <= 3:  # Weakness threshold
                    weakness_areas.append({
                        'domain': domain.name.replace('_', ' '),
                        'stanine': domain.stanine,
                        'level': 'weakness'
                    })
        return weakness_areas
    
    def _format_academic_subjects(self, academic_assessments):
        """Format academic subjects for the API response"""
        formatted_subjects = []
        for assessment in academic_assessments:
            if hasattr(assessment, 'subjects'):
                for subject in assessment.subjects:
                    # Determine level based on stanine
                    level = 'weakness' if subject.stanine <= 3 else 'strength' if subject.stanine >= 7 else 'balanced'
                    
                    formatted_subjects.append({
                        'name': subject.name,
                        'stanine': subject.stanine,
                        'level': level,
                        'percentile': subject.percentile
                    })
        return formatted_subjects
    
    def process_student_files(self, pass_file=None, cat4_file=None, academic_file=None):
        """Process uploaded student data files and return analyzed results"""
        # Initialize the models if not already done
        if self.pass_model is None or self.academic_model is None:
            self.train_models(None)  # Train with synthetic data
        
        try:
            # Load and process PASS data
            if pass_file:
                pass_data = pd.read_excel(pass_file) if pass_file.endswith('.xlsx') else pd.read_csv(pass_file)
                # Preprocess PASS data (handle column names, missing values, etc.)
                pass_data = self._preprocess_pass_data(pass_data)
            else:
                pass_data = None
            
            # Load and process CAT4 data
            if cat4_file:
                cat4_data = pd.read_excel(cat4_file) if cat4_file.endswith('.xlsx') else pd.read_csv(cat4_file)
                # Preprocess CAT4 data
                cat4_data = self._preprocess_cat4_data(cat4_data)
            else:
                cat4_data = None
            
            # Load and process academic data
            if academic_file:
                academic_data = pd.read_excel(academic_file) if academic_file.endswith('.xlsx') else pd.read_csv(academic_file)
                # Preprocess academic data
                academic_data = self._preprocess_academic_data(academic_data)
            else:
                academic_data = None
            
            # Merge the datasets on student ID
            merged_data = self._merge_datasets(pass_data, cat4_data, academic_data)
            
            # Analyze the merged data
            analysis_results = self._analyze_student_data(merged_data)
            
            return analysis_results
            
        except Exception as e:
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    def _preprocess_pass_data(self, data):
        """Simplified preprocessing for PASS data"""
        # In a real implementation, this would properly preprocess the data
        return data
    
    def _preprocess_cat4_data(self, data):
        """Simplified preprocessing for CAT4 data"""
        # In a real implementation, this would properly preprocess the data
        return data
    
    def _preprocess_academic_data(self, data):
        """Simplified preprocessing for academic data"""
        # In a real implementation, this would properly preprocess the data
        return data
    
    def _merge_datasets(self, pass_data, cat4_data, academic_data):
        """Simplified dataset merging"""
        # In a real implementation, this would properly merge the datasets
        # For the stub implementation, we'll just return some dummy data
        return pd.DataFrame({
            'student_id': ['1', '2', '3'],
            'name': ['Student 1', 'Student 2', 'Student 3'],
            'grade': ['9', '9', '10']
        })
    
    def _analyze_student_data(self, data):
        """Simplified student data analysis"""
        # In a real implementation, this would analyze each student's data
        # For the stub implementation, we'll return a basic result structure
        return {
            'grade_level_summary': {},
            'students': [
                {
                    'student_id': '1',
                    'name': 'Student 1',
                    'grade': '9',
                    'pass_analysis': {'available': False},
                    'cat4_analysis': {'available': False},
                    'academic_analysis': {'available': False},
                    'is_fragile_learner': False,
                    'interventions': []
                }
            ]
        }
    
    def train_models(self, data):
        """Initialize prediction models with synthetic data if needed"""
        # In a real implementation, this would train ML models
        # For stub implementation, create dummy classifiers
        self.pass_model = RandomForestClassifier(n_estimators=10, random_state=42)
        self.academic_model = RandomForestClassifier(n_estimators=10, random_state=42)
        
        # Generate some synthetic training data
        X = np.random.rand(100, 5)
        y = np.random.choice(['At Risk', 'Balanced', 'Strength'], size=100)
        
        # Train the models on synthetic data
        self.pass_model.fit(X, y)
        self.academic_model.fit(X, y)
        
        return {'pass_model_accuracy': 0.8, 'academic_model_accuracy': 0.8}
    
    def generateInterventions(self, pass_analysis, cat4_analysis, academic_analysis, is_fragile_learner):
        """Generate intervention recommendations"""
        interventions = []
        
        # Add PASS interventions
        if pass_analysis and pass_analysis.get('available', False):
            for risk in pass_analysis.get('riskAreas', []):
                factor = risk['factor'].replace(' ', '_')
                if factor in self.emotional_interventions and 'At Risk' in self.emotional_interventions[factor]:
                    for intervention in self.emotional_interventions[factor]['At Risk']:
                        interventions.append({
                            'domain': 'emotional',
                            'factor': risk['factor'],
                            'title': intervention['title'],
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
        
        # Add CAT4 interventions
        if cat4_analysis and cat4_analysis.get('available', False):
            for weakness in cat4_analysis.get('weaknessAreas', []):
                domain = weakness['domain'].replace(' ', '_')
                if domain in self.cognitive_interventions and 'Weakness' in self.cognitive_interventions[domain]:
                    for intervention in self.cognitive_interventions[domain]['Weakness']:
                        interventions.append({
                            'domain': 'cognitive',
                            'factor': weakness['domain'],
                            'title': intervention['title'],
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
            
            # Add fragile learner intervention
            if is_fragile_learner and 'Fragile_Learner' in self.cognitive_interventions:
                for intervention in self.cognitive_interventions['Fragile_Learner']['Yes']:
                    interventions.append({
                        'domain': 'holistic',
                        'factor': 'Fragile Learner',
                        'title': intervention['title'],
                        'description': intervention['description'],
                        'priority': intervention['priority']
                    })
        
        # Add academic interventions
        if academic_analysis and academic_analysis.get('available', False):
            for subject in academic_analysis.get('subjects', []):
                if subject.get('level', '') == 'weakness':
                    for intervention in self.academic_interventions['Weakness']:
                        interventions.append({
                            'domain': 'academic',
                            'factor': f"{subject['name']} Performance",
                            'title': f"{subject['name']} {intervention['title']}",
                            'description': intervention['description'].replace('Subject', subject['name']),
                            'priority': intervention['priority']
                        })
        
        return interventions
    
    def generateCompoundInterventions(self, pass_analysis, cat4_analysis, academic_analysis, is_fragile_learner):
        """Generate compound intervention recommendations"""
        # In a real implementation, this would generate more complex interventions
        # For the stub implementation, return a single compound intervention
        if is_fragile_learner:
            return [{
                'domain': 'integrated',
                'factor': 'Multiple Factors',
                'title': 'Comprehensive Support Plan',
                'description': 'Integrated approach addressing cognitive, emotional, and academic needs through a coordinated intervention strategy.',
                'priority': 'high',
                'impact': 'high'
            }]
        
        return []

class ProgressTracker:
    """
    Tracks student progress over time and analyzes intervention effectiveness
    """
    
    def __init__(self):
        """Initialize the progress tracker with default thresholds"""
        self.assessment_types = {
            'PASS': 'PASS',
            'CAT4': 'CAT4',
            'ACADEMIC': 'ACADEMIC'
        }
        
        # Define expected improvement thresholds for different assessment types
        self.improvement_thresholds = {
            'PASS': 5,  # 5 percentile points improvement considered significant
            'CAT4': 0.5,  # 0.5 stanine improvement considered significant
            'ACADEMIC': 0.5  # 0.5 stanine improvement considered significant
        }
    
    def track_progress(self, current_data, previous_data):
        """
        Track progress between two assessment periods
        """
        if not previous_data:
            return {
                'hasBaseline': False,
                'message': "No previous assessment data available for comparison."
            }
        
        progress = {
            'hasBaseline': True,
            'pass_analysis': self._analyze_pass_progress(current_data.get('pass_analysis', {}), 
                                                       previous_data.get('pass_analysis', {})),
            'cat4_analysis': self._analyze_cat4_progress(current_data.get('cat4_analysis', {}), 
                                                       previous_data.get('cat4_analysis', {})),
            'academic_analysis': self._analyze_academic_progress(current_data.get('academic_analysis', {}), 
                                                               previous_data.get('academic_analysis', {})),
            'interventionEffectiveness': self._analyze_intervention_effectiveness(
                current_data, 
                previous_data
            ),
            'improvementAreas': [],
            'concernAreas': [],
            'summary': ""
        }
        
        # Compile improvement and concern areas
        self._compile_improvement_areas(progress)
        self._compile_concern_areas(progress)
        
        # Generate summary
        progress['summary'] = self._generate_progress_summary(progress)
        
        return progress
    
    def _analyze_pass_progress(self, current_pass, previous_pass):
        """Analyze progress in PASS factors"""
        if not current_pass.get('available', False) or not previous_pass.get('available', False):
            return {
                'available': False,
                'message': "PASS comparison not available."
            }
        
        factor_analysis = {}
        current_factors = current_pass.get('factors', [])
        previous_factors = previous_pass.get('factors', [])
        
        # Compare each factor
        for factor in current_factors:
            prev_factor = next((f for f in previous_factors if f['name'] == factor['name']), None)
            
            if prev_factor:
                change = factor['percentile'] - prev_factor['percentile']
                is_significant = abs(change) >= self.improvement_thresholds['PASS']
                direction = "improved" if change > 0 else "declined" if change < 0 else "unchanged"
                
                factor_analysis[factor['name']] = {
                    'current': factor['percentile'],
                    'previous': prev_factor['percentile'],
                    'change': change,
                    'isSignificant': is_significant,
                    'direction': direction,
                    'status': self._get_change_status(change, self.improvement_thresholds['PASS'])
                }
        
        # Calculate overall PASS progress
        changes = [a['change'] for a in factor_analysis.values()]
        average_change = sum(changes) / len(changes) if changes else 0
        
        return {
            'available': True,
            'factorAnalysis': factor_analysis,
            'averageChange': average_change,
            'overallStatus': self._get_change_status(average_change, self.improvement_thresholds['PASS'])
        }
    
    def _analyze_cat4_progress(self, current_cat4, previous_cat4):
        """Analyze progress in CAT4 domains"""
        if not current_cat4.get('available', False) or not previous_cat4.get('available', False):
            return {
                'available': False,
                'message': "CAT4 comparison not available."
            }
        
        domain_analysis = {}
        current_domains = current_cat4.get('domains', [])
        previous_domains = previous_cat4.get('domains', [])
        
        # Compare each domain
        for domain in current_domains:
            prev_domain = next((d for d in previous_domains if d['name'] == domain['name']), None)
            
            if prev_domain:
                change = domain['stanine'] - prev_domain['stanine']
                is_significant = abs(change) >= self.improvement_thresholds['CAT4']
                direction = "improved" if change > 0 else "declined" if change < 0 else "unchanged"
                
                domain_analysis[domain['name']] = {
                    'current': domain['stanine'],
                    'previous': prev_domain['stanine'],
                    'change': change,
                    'isSignificant': is_significant,
                    'direction': direction,
                    'status': self._get_change_status(change, self.improvement_thresholds['CAT4'])
                }
        
        # Check for change in fragile learner status
        fragile_learner_change = {
            'current': current_cat4.get('is_fragile_learner', False),
            'previous': previous_cat4.get('is_fragile_learner', False),
            'hasChanged': current_cat4.get('is_fragile_learner', False) != previous_cat4.get('is_fragile_learner', False),
            'direction': "unchanged"
        }
        
        if fragile_learner_change['hasChanged']:
            fragile_learner_change['direction'] = "negative" if current_cat4.get('is_fragile_learner', False) else "positive"
        
        # Calculate overall CAT4 progress
        changes = [a['change'] for a in domain_analysis.values()]
        average_change = sum(changes) / len(changes) if changes else 0
        
        return {
            'available': True,
            'domainAnalysis': domain_analysis,
            'fragileLearnerChange': fragile_learner_change,
            'averageChange': average_change,
            'overallStatus': self._get_change_status(average_change, self.improvement_thresholds['CAT4'])
        }
    
    def _analyze_academic_progress(self, current_academic, previous_academic):
        """Analyze progress in academic performance"""
        if not current_academic.get('available', False) or not previous_academic.get('available', False):
            return {
                'available': False,
                'message': "Academic comparison not available."
            }
        
        subject_analysis = {}
        current_subjects = current_academic.get('subjects', [])
        previous_subjects = previous_academic.get('subjects', [])
        
        # Compare each subject
        for subject in current_subjects:
            prev_subject = next((s for s in previous_subjects if s['name'] == subject['name']), None)
            
            if prev_subject:
                change = subject['stanine'] - prev_subject['stanine']
                is_significant = abs(change) >= self.improvement_thresholds['ACADEMIC']
                direction = "improved" if change > 0 else "declined" if change < 0 else "unchanged"
                
                subject_analysis[subject['name']] = {
                    'current': subject['stanine'],
                    'previous': prev_subject['stanine'],
                    'change': change,
                    'isSignificant': is_significant,
                    'direction': direction,
                    'status': self._get_change_status(change, self.improvement_thresholds['ACADEMIC'])
                }
        
        # Calculate overall academic progress
        changes = [a['change'] for a in subject_analysis.values()]
        average_change = sum(changes) / len(changes) if changes else 0
        
        return {
            'available': True,
            'subjectAnalysis': subject_analysis,
            'averageChange': average_change,
            'overallStatus': self._get_change_status(average_change, self.improvement_thresholds['ACADEMIC'])
        }
    
    def _analyze_intervention_effectiveness(self, current_data, previous_data):
        """Analyze intervention effectiveness"""
        # Get previous interventions
        previous_interventions = previous_data.get('interventions', [])
        
        if not previous_interventions:
            return {
                'available': False,
                'message': "No previous interventions to evaluate."
            }
        
        interventions = {}
        
        # Analyze each previous intervention
        for intervention in previous_interventions:
            domain = intervention.get('domain', '')
            factor = intervention.get('factor', '')
            
            # Find related improvement
            effectiveness = "unknown"
            evidence = ""
            
            # Check PASS improvements for emotional/behavioral interventions
            if domain in ['emotional', 'behavioral']:
                if (current_data.get('pass_analysis', {}).get('available', False) and 
                    previous_data.get('pass_analysis', {}).get('available', False)):
                    
                    pass_factors = current_data['pass_analysis'].get('factors', [])
                    prev_pass_factors = previous_data['pass_analysis'].get('factors', [])
                    
                    # Find factors related to this intervention
                    related_factors = [f for f in pass_factors if factor.lower() in f['name'].lower()]
                    
                    if related_factors:
                        # Check for improvement in related factors
                        total_change = 0
                        factor_count = 0
                        
                        for related_factor in related_factors:
                            prev_factor = next((f for f in prev_pass_factors if f['name'] == related_factor['name']), None)
                            if prev_factor:
                                change = related_factor['percentile'] - prev_factor['percentile']
                                total_change += change
                                factor_count += 1
                                evidence += f"{related_factor['name']}: {'+' if change > 0 else ''}{change:.1f} percentile points. "
                        
                        if factor_count > 0:
                            avg_change = total_change / factor_count
                            if avg_change >= self.improvement_thresholds['PASS']:
                                effectiveness = "effective"
                            elif avg_change <= -self.improvement_thresholds['PASS']:
                                effectiveness = "not effective"
                            else:
                                effectiveness = "partially effective"
            
            # Check CAT4 improvements for cognitive interventions
            elif domain == 'cognitive':
                if (current_data.get('cat4_analysis', {}).get('available', False) and 
                    previous_data.get('cat4_analysis', {}).get('available', False)):
                    
                    cat4_domains = current_data['cat4_analysis'].get('domains', [])
                    prev_cat4_domains = previous_data['cat4_analysis'].get('domains', [])
                    
                    # Find domains related to this intervention
                    related_domains = [d for d in cat4_domains if factor.lower() in d['name'].lower()]
                    
                    if related_domains:
                        # Check for improvement in related domains
                        total_change = 0
                        domain_count = 0
                        
                        for related_domain in related_domains:
                            prev_domain = next((d for d in prev_cat4_domains if d['name'] == related_domain['name']), None)
                            if prev_domain:
                                change = related_domain['stanine'] - prev_domain['stanine']
                                total_change += change
                                domain_count += 1
                                evidence += f"{related_domain['name']}: {'+' if change > 0 else ''}{change:.1f} stanine points. "
                        
                        if domain_count > 0:
                            avg_change = total_change / domain_count
                            if avg_change >= self.improvement_thresholds['CAT4']:
                                effectiveness = "effective"
                            elif avg_change <= -self.improvement_thresholds['CAT4']:
                                effectiveness = "not effective"
                            else:
                                effectiveness = "partially effective"
            
            # Check academic improvements for academic interventions
            elif domain == 'academic':
                if (current_data.get('academic_analysis', {}).get('available', False) and 
                    previous_data.get('academic_analysis', {}).get('available', False)):
                    
                    subjects = current_data['academic_analysis'].get('subjects', [])
                    prev_subjects = previous_data['academic_analysis'].get('subjects', [])
                    
                    # Find subjects related to this intervention
                    subject_name = factor.replace(' Performance', '')
                    related_subjects = [s for s in subjects if subject_name.lower() in s['name'].lower()]
                    
                    if related_subjects:
                        # Check for improvement in related subjects
                        total_change = 0
                        subject_count = 0
                        
                        for related_subject in related_subjects:
                            prev_subject = next((s for s in prev_subjects if s['name'] == related_subject['name']), None)
                            if prev_subject:
                                change = related_subject['stanine'] - prev_subject['stanine']
                                total_change += change
                                subject_count += 1
                                evidence += f"{related_subject['name']}: {'+' if change > 0 else ''}{change:.1f} stanine points. "
                        
                        if subject_count > 0:
                            avg_change = total_change / subject_count
                            if avg_change >= self.improvement_thresholds['ACADEMIC']:
                                effectiveness = "effective"
                            elif avg_change <= -self.improvement_thresholds['ACADEMIC']:
                                effectiveness = "not effective"
                            else:
                                effectiveness = "partially effective"
            
            interventions[intervention['title']] = {
                'domain': domain,
                'factor': factor,
                'effectiveness': effectiveness,
                'evidence': evidence
            }
        
        return {
            'available': True,
            'interventions': interventions
        }
    
    def _get_change_status(self, change, threshold):
        """Get status of change based on threshold"""
        if change >= threshold:
            return "significant improvement"
        if change > 0:
            return "slight improvement"
        if change == 0:
            return "no change"
        if change > -threshold:
            return "slight decline"
        return "significant decline"
    
    def _compile_improvement_areas(self, progress):
        """Compile improvement areas based on progress analysis"""
        # PASS improvements
        if progress['pass_analysis'].get('available', False):
            for factor, analysis in progress['pass_analysis'].get('factorAnalysis', {}).items():
                if analysis['status'] == "significant improvement":
                    progress['improvementAreas'].append({
                        'domain': "PASS",
                        'factor': factor,
                        'improvement': f"{analysis['change']:.1f} percentile points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight improvement":
                    progress['improvementAreas'].append({
                        'domain': "PASS",
                        'factor': factor,
                        'improvement': f"{analysis['change']:.1f} percentile points",
                        'significance': "slight"
                    })
        
        # CAT4 improvements
        if progress['cat4_analysis'].get('available', False):
            for domain, analysis in progress['cat4_analysis'].get('domainAnalysis', {}).items():
                if analysis['status'] == "significant improvement":
                    progress['improvementAreas'].append({
                        'domain': "CAT4",
                        'factor': domain,
                        'improvement': f"{analysis['change']:.1f} stanine points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight improvement":
                    progress['improvementAreas'].append({
                        'domain': "CAT4",
                        'factor': domain,
                        'improvement': f"{analysis['change']:.1f} stanine points",
                        'significance': "slight"
                    })
            
            # Include fragile learner improvement
            if (progress['cat4_analysis'].get('fragileLearnerChange', {}).get('hasChanged', False) and 
                progress['cat4_analysis']['fragileLearnerChange']['direction'] == "positive"):
                progress['improvementAreas'].append({
                    'domain': "CAT4",
                    'factor': "Fragile Learner Status",
                    'improvement': "No longer classified as a fragile learner",
                    'significance': "significant"
                })
        
        # Academic improvements
        if progress['academic_analysis'].get('available', False):
            for subject, analysis in progress['academic_analysis'].get('subjectAnalysis', {}).items():
                if analysis['status'] == "significant improvement":
                    progress['improvementAreas'].append({
                        'domain': "Academic",
                        'factor': subject,
                        'improvement': f"{analysis['change']:.1f} stanine points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight improvement":
                    progress['improvementAreas'].append({
                        'domain': "Academic",
                        'factor': subject,
                        'improvement': f"{analysis['change']:.1f} stanine points",
                        'significance': "slight"
                    })
    
    def _compile_concern_areas(self, progress):
        """Compile concern areas based on progress analysis"""
        # PASS concerns
        if progress['pass_analysis'].get('available', False):
            for factor, analysis in progress['pass_analysis'].get('factorAnalysis', {}).items():
                if analysis['status'] == "significant decline":
                    progress['concernAreas'].append({
                        'domain': "PASS",
                        'factor': factor,
                        'decline': f"{analysis['change']:.1f} percentile points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight decline":
                    progress['concernAreas'].append({
                        'domain': "PASS",
                        'factor': factor,
                        'decline': f"{analysis['change']:.1f} percentile points",
                        'significance': "slight"
                    })
        
        # CAT4 concerns
        if progress['cat4_analysis'].get('available', False):
            for domain, analysis in progress['cat4_analysis'].get('domainAnalysis', {}).items():
                if analysis['status'] == "significant decline":
                    progress['concernAreas'].append({
                        'domain': "CAT4",
                        'factor': domain,
                        'decline': f"{analysis['change']:.1f} stanine points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight decline":
                    progress['concernAreas'].append({
                        'domain': "CAT4",
                        'factor': domain,
                        'decline': f"{analysis['change']:.1f} stanine points",
                        'significance': "slight"
                    })
            
            # Include fragile learner decline
            if (progress['cat4_analysis'].get('fragileLearnerChange', {}).get('hasChanged', False) and 
                progress['cat4_analysis']['fragileLearnerChange']['direction'] == "negative"):
                progress['concernAreas'].append({
                    'domain': "CAT4",
                    'factor': "Fragile Learner Status",
                    'decline': "Now classified as a fragile learner",
                    'significance': "significant"
                })
        
        # Academic concerns
        if progress['academic_analysis'].get('available', False):
            for subject, analysis in progress['academic_analysis'].get('subjectAnalysis', {}).items():
                if analysis['status'] == "significant decline":
                    progress['concernAreas'].append({
                        'domain': "Academic",
                        'factor': subject,
                        'decline': f"{analysis['change']:.1f} stanine points",
                        'significance': "significant"
                    })
                elif analysis['status'] == "slight decline":
                    progress['concernAreas'].append({
                        'domain': "Academic",
                        'factor': subject,
                        'decline': f"{analysis['change']:.1f} stanine points",
                        'significance': "slight"
                    })
    
    def _generate_progress_summary(self, progress):
        """Generate summary of progress"""
        summary = ""
        
        # Add overall assessment
        assessments_available = []
        if progress['pass_analysis'].get('available', False):
            assessments_available.append("PASS")
        if progress['cat4_analysis'].get('available', False):
            assessments_available.append("CAT4")
        if progress['academic_analysis'].get('available', False):
            assessments_available.append("Academic")
        
        if not assessments_available:
            return "No comparable assessment data available."
        
        summary += f"Progress summary based on {', '.join(assessments_available)} data: "
        
        # Calculate overall direction
        overall_changes = []
        if progress['pass_analysis'].get('available', False):
            overall_changes.append(progress['pass_analysis'].get('averageChange', 0))
        if progress['cat4_analysis'].get('available', False):
            overall_changes.append(progress['cat4_analysis'].get('averageChange', 0))
        if progress['academic_analysis'].get('available', False):
            overall_changes.append(progress['academic_analysis'].get('averageChange', 0))
        
        avg_overall_change = sum(overall_changes) / len(overall_changes) if overall_changes else 0
        
        if avg_overall_change > 0.5:
            summary += "The student has shown overall improvement across assessment areas. "
        elif avg_overall_change < -0.5:
            summary += "The student has shown overall decline across assessment areas. "
        else:
            summary += "The student has shown mixed results or minimal change across assessment areas. "
        
        # Add highlights of key improvements
        if progress['improvementAreas']:
            summary += f"Notable improvements in {', '.join([area['factor'] for area in progress['improvementAreas'][:2]])}. "
        
        # Add highlights of key concerns
        if progress['concernAreas']:
            summary += f"Areas of concern include {', '.join([area['factor'] for area in progress['concernAreas'][:2]])}. "
        
        # Add intervention effectiveness summary
        if progress['interventionEffectiveness'].get('available', False):
            interventions = progress['interventionEffectiveness'].get('interventions', {})
            
            if interventions:
                effective_count = sum(1 for i in interventions.values() if i['effectiveness'] == "effective")
                partial_count = sum(1 for i in interventions.values() if i['effectiveness'] == "partially effective")
                ineffective_count = sum(1 for i in interventions.values() if i['effectiveness'] == "not effective")
                
                summary += f"Of the previous interventions, {effective_count} were effective, {partial_count} were partially effective, and {ineffective_count} were not effective. "
                
                # Add most effective intervention
                most_effective = next((i for i in interventions.items() if i[1]['effectiveness'] == "effective"), None)
                if most_effective:
                    summary += f"The \"{most_effective[0]}\" intervention showed the most positive impact. "
        
        return summary
    
# Add this class to app/engine/analytics.py after the ProgressTracker class

class PredictiveAnalytics:
    """
    Predictive analytics engine for early risk identification and intervention recommendations
    """
    
    def __init__(self):
        """Initialize predictive analytics with risk thresholds"""
        # Define risk factor weights for predictive model
        self.risk_factor_weights = {
            # PASS factors
            'self_regard': 0.8,
            'perceived_learning': 0.6,
            'attitude_teachers': 0.7,
            'general_work_ethic': 0.9,
            'confidence_learning': 0.7,
            'preparedness': 0.6,
            'emotional_control': 0.8,
            'social_confidence': 0.5,
            'curriculum_demand': 0.6,
            
            # CAT4 domains
            'verbal_reasoning': 0.7,
            'quantitative_reasoning': 0.7,
            'nonverbal_reasoning': 0.6,
            'spatial_reasoning': 0.5,
            
            # Combined factors
            'fragile_learner': 0.9,
            'academic_underperformance': 0.8,
            'declining_trends': 0.9,
            'attendance_issues': 0.7
        }
        
        # Define threshold values for risk prediction
        self.thresholds = {
            'high_risk': 0.7,
            'medium_risk': 0.4,
            'borderline': 0.3
        }
        
        # Define early indicators of potential future risks
        self.early_indicators = {
            # Minor PASS declines that might predict future issues
            'pass_early_warnings': {
                'self_regard_threshold': 50,
                'work_ethic_threshold': 55,
                'emotional_control_threshold': 50
            },
            
            # Small gaps between cognitive potential and performance
            'potential_gap_threshold': 1,  # 1 stanine difference
            
            # Patterns in assessment fluctuations
            'volatility_threshold': 10,  # 10% variability in PASS scores
            
            # Combined risk patterns
            'combined_threshold': 0.25
        }
    
    def predict_risk(self, student_data, historical_data=None):
        """
        Analyze student data to predict future risk
        Args:
            student_data: Current student data
            historical_data: Array of previous student analyses
        Returns:
            Risk prediction results
        """
        if historical_data is None:
            historical_data = []
        
        # Initialize prediction results
        prediction = {
            'overall_risk_score': 0,
            'risk_level': 'low',
            'risk_factors': [],
            'early_indicators': [],
            'trend_analysis': self._analyze_trends(student_data, historical_data),
            'time_to_intervention': 'not urgent',
            'confidence': 0.0,
            'recommendations': []
        }
        
        # Calculate current risk factors
        current_risk_factors = self._calculate_current_risk_factors(student_data)
        prediction['risk_factors'] = current_risk_factors.get('factors', [])
        
        # Calculate early warning indicators
        early_warnings = self._identify_early_warnings(student_data, historical_data)
        prediction['early_indicators'] = early_warnings.get('indicators', [])
        
        # Calculate overall risk score
        weighted_current_risk = current_risk_factors.get('score', 0) * 0.7
        weighted_early_risk = early_warnings.get('score', 0) * 0.3
        prediction['overall_risk_score'] = weighted_current_risk + weighted_early_risk
        
        # Determine risk level
        if prediction['overall_risk_score'] >= self.thresholds['high_risk']:
            prediction['risk_level'] = 'high'
            prediction['time_to_intervention'] = 'urgent'
        elif prediction['overall_risk_score'] >= self.thresholds['medium_risk']:
            prediction['risk_level'] = 'medium'
            prediction['time_to_intervention'] = 'soon'
        elif prediction['overall_risk_score'] >= self.thresholds['borderline']:
            prediction['risk_level'] = 'borderline'
            prediction['time_to_intervention'] = 'monitor'
        else:
            prediction['risk_level'] = 'low'
            prediction['time_to_intervention'] = 'not urgent'
        
        # Calculate confidence based on data completeness
        prediction['confidence'] = self._calculate_prediction_confidence(student_data, historical_data)
        
        # Generate preventive recommendations
        prediction['recommendations'] = self._generate_preventive_recommendations(
            prediction['risk_level'],
            prediction['risk_factors'],
            prediction['early_indicators'],
            prediction['trend_analysis']
        )
        
        return prediction
    
    def _calculate_current_risk_factors(self, student_data):
        """Calculate risk factors from current student data"""
        risk_factors = []
        total_score = 0
        factor_count = 0
        
        # PASS risk factors
        if student_data.get('pass_analysis', {}).get('available', False):
            for risk_area in student_data['pass_analysis'].get('riskAreas', []):
                factor_name = risk_area['factor']
                percentile = risk_area['percentile']
                
                # Calculate risk level (lower percentile = higher risk)
                risk_level = max(0, (45 - percentile) / 45)
                weight = self.risk_factor_weights.get(factor_name.lower().replace(' ', '_'), 0.5)
                weighted_risk = risk_level * weight
                
                risk_factors.append({
                    'domain': 'PASS',
                    'factor': factor_name,
                    'level': risk_level,
                    'weighted_risk': weighted_risk,
                    'details': f"{factor_name} at {percentile}th percentile (below risk threshold)"
                })
                
                total_score += weighted_risk
                factor_count += 1
        
        # CAT4 risk factors
        if student_data.get('cat4_analysis', {}).get('available', False):
            for weakness in student_data['cat4_analysis'].get('weaknessAreas', []):
                domain_name = weakness['domain']
                stanine = weakness.get('stanine', 0)
                
                # Calculate risk level (lower stanine = higher risk)
                risk_level = (4 - stanine) / 3 if stanine > 0 else 0
                weight = self.risk_factor_weights.get(domain_name.lower().replace(' ', '_'), 0.5)
                weighted_risk = risk_level * weight
                
                risk_factors.append({
                    'domain': 'CAT4',
                    'factor': domain_name,
                    'level': risk_level,
                    'weighted_risk': weighted_risk,
                    'details': f"{domain_name} at stanine {stanine} (below average)"
                })
                
                total_score += weighted_risk
                factor_count += 1
            
            # Add fragile learner as risk factor
            if student_data['cat4_analysis'].get('is_fragile_learner', False) or student_data.get('is_fragile_learner', False):
                weight = self.risk_factor_weights['fragile_learner']
                weighted_risk = 1.0 * weight
                
                risk_factors.append({
                    'domain': 'CAT4',
                    'factor': 'Fragile Learner',
                    'level': 1.0,
                    'weighted_risk': weighted_risk,
                    'details': 'Student is classified as a fragile learner'
                })
                
                total_score += weighted_risk
                factor_count += 1
        
        # Academic risk factors
        if student_data.get('academic_analysis', {}).get('available', False):
            for subject in student_data['academic_analysis'].get('subjects', []):
                if subject.get('level', '') == 'weakness':
                    subject_name = subject['name']
                    stanine = subject.get('stanine', 0)
                    
                    # Calculate risk level
                    risk_level = (4 - stanine) / 3 if stanine > 0 else 0
                    weighted_risk = risk_level * 0.6  # Standard weight for academic subjects
                    
                    risk_factors.append({
                        'domain': 'Academic',
                        'factor': subject_name,
                        'level': risk_level,
                        'weighted_risk': weighted_risk,
                        'details': f"{subject_name} at stanine {stanine} (below average)"
                    })
                    
                    total_score += weighted_risk
                    factor_count += 1
        
        # Calculate average risk score
        avg_score = total_score / factor_count if factor_count > 0 else 0
        
        # Sort factors by weighted risk
        risk_factors.sort(key=lambda x: x['weighted_risk'], reverse=True)
        
        return {
            'factors': risk_factors,
            'score': avg_score
        }
    
    def _identify_early_warnings(self, student_data, historical_data):
        """Identify early warning indicators that could predict future issues"""
        early_warning_indicators = []
        total_warning_score = 0
        warning_count = 0
        
        # PASS warnings - factors approaching risk threshold
        if student_data.get('pass_analysis', {}).get('available', False):
            for factor in student_data['pass_analysis'].get('factors', []):
                factor_name = factor['name'].lower()
                percentile = factor['percentile']
                
                # Check specific key factors approaching risk threshold
                thresholds = self.early_indicators['pass_early_warnings']
                
                # Self-regard approaching risk
                if ('self' in factor_name and 'regard' in factor_name and 
                   percentile >= 40 and percentile <= thresholds.get('self_regard_threshold', 50)):
                    warning_level = (thresholds.get('self_regard_threshold', 50) - percentile) / 10
                    
                    early_warning_indicators.append({
                        'domain': 'PASS',
                        'indicator': 'Self-Regard Approaching Risk',
                        'level': warning_level,
                        'details': f"Self-regard at {percentile}th percentile - approaching risk threshold"
                    })
                    
                    total_warning_score += warning_level
                    warning_count += 1
                
                # Work ethic approaching risk
                if ('work' in factor_name and 'ethic' in factor_name and 
                   percentile >= 40 and percentile <= thresholds.get('work_ethic_threshold', 55)):
                    warning_level = (thresholds.get('work_ethic_threshold', 55) - percentile) / 15
                    
                    early_warning_indicators.append({
                        'domain': 'PASS',
                        'indicator': 'Work Ethic Approaching Risk',
                        'level': warning_level,
                        'details': f"Work ethic at {percentile}th percentile - approaching risk threshold"
                    })
                    
                    total_warning_score += warning_level
                    warning_count += 1
                
                # Emotional control approaching risk
                if ('emotional' in factor_name and 
                   percentile >= 40 and percentile <= thresholds.get('emotional_control_threshold', 50)):
                    warning_level = (thresholds.get('emotional_control_threshold', 50) - percentile) / 10
                    
                    early_warning_indicators.append({
                        'domain': 'PASS',
                        'indicator': 'Emotional Control Approaching Risk',
                        'level': warning_level,
                        'details': f"Emotional control at {percentile}th percentile - approaching risk threshold"
                    })
                    
                    total_warning_score += warning_level
                    warning_count += 1
        
        # Calculate average warning score
        avg_warning_score = total_warning_score / warning_count if warning_count > 0 else 0
        
        return {
            'indicators': early_warning_indicators,
            'score': avg_warning_score
        }
    
    def _analyze_trends(self, student_data, historical_data):
        """Analyze trends across assessment data"""
        if not historical_data:
            return {
                'available': False,
                'message': "No historical data available for trend analysis."
            }
        
        # Initialize trend analysis
        trend_analysis = {
            'available': True,
            'pass_trends': {},
            'cat4_trends': {},
            'academic_trends': {},
            'overall_direction': 'stable'
        }
        
        # For a simple implementation, determine overall direction
        # based on comparing current vs. previous assessment
        if len(historical_data) > 0:
            previous_data = historical_data[0]
            
            # Compare PASS data
            if (student_data.get('pass_analysis', {}).get('available', False) and 
                previous_data.get('pass_analysis', {}).get('available', False)):
                
                current_pass = student_data['pass_analysis']
                previous_pass = previous_data['pass_analysis']
                
                # Compare factors and count improvements/declines
                improving_count = 0
                declining_count = 0
                
                for current_factor in current_pass.get('factors', []):
                    factor_name = current_factor['name']
                    current_percentile = current_factor['percentile']
                    
                    # Find matching factor in previous data
                    prev_factor = next((f for f in previous_pass.get('factors', []) 
                                       if f['name'] == factor_name), None)
                    
                    if prev_factor:
                        previous_percentile = prev_factor['percentile']
                        if current_percentile > previous_percentile:
                            improving_count += 1
                        elif current_percentile < previous_percentile:
                            declining_count += 1
                
                if improving_count > declining_count:
                    trend_analysis['pass_trends']['direction'] = 'improving'
                elif declining_count > improving_count:
                    trend_analysis['pass_trends']['direction'] = 'declining'
                else:
                    trend_analysis['pass_trends']['direction'] = 'stable'
            
            # Similar analysis could be done for CAT4 and academic data
            # Omitted for brevity
        
        return trend_analysis
    
    def _calculate_prediction_confidence(self, student_data, historical_data):
        """Calculate confidence in the prediction based on data completeness"""
        confidence = 0.5  # Base confidence
        
        # Adjust based on data completeness
        if student_data.get('pass_analysis', {}).get('available', False):
            confidence += 0.1
        
        if student_data.get('cat4_analysis', {}).get('available', False):
            confidence += 0.1
        
        if student_data.get('academic_analysis', {}).get('available', False):
            confidence += 0.1
        
        # Historical data increases confidence
        if historical_data:
            confidence += min(0.2, len(historical_data) * 0.05)
        
        # Cap confidence at 95%
        return min(0.95, confidence)
    
    def _generate_preventive_recommendations(self, risk_level, risk_factors, early_warnings, trend_analysis):
        """Generate preventive recommendations based on risk analysis"""
        recommendations = []
        
        # High risk recommendations
        if risk_level == 'high':
            # High priority intervention
            recommendations.append({
                'priority': 'high',
                'type': 'intervention',
                'title': 'Immediate Comprehensive Intervention',
                'description': 'Implement a multi-faceted intervention plan addressing all risk areas immediately. Schedule weekly progress monitoring.',
                'timeframe': 'Within 1 week'
            })
            
            # Add specific recommendations for top risk factors
            for factor in risk_factors[:2]:  # Top 2 risk factors
                recommendations.append({
                    'priority': 'high',
                    'type': 'targeted',
                    'title': f"Address {factor['factor']}",
                    'description': f"Implement targeted intervention for {factor['factor']} which is a significant risk area.",
                    'timeframe': 'Within 2 weeks'
                })
        
        # Medium risk recommendations
        elif risk_level == 'medium':
            recommendations.append({
                'priority': 'medium',
                'type': 'intervention',
                'title': 'Coordinated Intervention Plan',
                'description': 'Develop an intervention plan targeting the identified risk areas. Schedule bi-weekly progress monitoring.',
                'timeframe': 'Within 2 weeks'
            })
            
            # Add specific recommendation for top risk factor
            if risk_factors:
                factor = risk_factors[0]  # Top risk factor
                recommendations.append({
                    'priority': 'medium',
                    'type': 'targeted',
                    'title': f"Address {factor['factor']}",
                    'description': f"Implement targeted support for {factor['factor']} which shows elevated risk.",
                    'timeframe': 'Within 3 weeks'
                })
        
        # Borderline risk recommendations
        elif risk_level == 'borderline':
            recommendations.append({
                'priority': 'medium',
                'type': 'monitoring',
                'title': 'Enhanced Monitoring Plan',
                'description': 'Implement closer monitoring of the identified early warning indicators. Schedule monthly check-ins.',
                'timeframe': 'Within 1 month'
            })
        
        # Low risk recommendations
        else:
            recommendations.append({
                'priority': 'low',
                'type': 'maintenance',
                'title': 'Maintain Current Support',
                'description': 'Continue current support strategies and regular monitoring to maintain positive trajectory.',
                'timeframe': 'Ongoing'
            })
        
        return recommendations

class StudentReportGenerator:
    """
    Generates comprehensive PDF reports for students based on analytics results.
    """
    
    def __init__(self, school_logo=None):
        """Initialize the report generator"""
        self.school_logo = school_logo
    
    def generate_report(self, student_analysis):
        """Generate a complete PDF report for a student"""
        # Create PDF object
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Add header with student information
        self._add_header(pdf, student_analysis)
        
        # Add PASS analysis section if available
        if student_analysis['pass_analysis'].get('available', False):
            self._add_pass_section(pdf, student_analysis['pass_analysis'])
        
        # Add CAT4 analysis section if available
        if student_analysis['cat4_analysis'].get('available', False):
            self._add_cat4_section(pdf, student_analysis['cat4_analysis'])
        
        # Add academic analysis section if available
        if student_analysis['academic_analysis'].get('available', False):
            self._add_academic_section(pdf, student_analysis['academic_analysis'])
        
        # Add intervention recommendations
        self._add_interventions_section(pdf, student_analysis['interventions'])
        
        # Return the generated PDF
        return pdf.output(dest='S').encode('latin1')
    
    def _add_header(self, pdf, student_analysis):
        """Add header with student information"""
        # Add school logo if available
        if self.school_logo:
            pdf.image(self.school_logo, x=10, y=8, w=30)
        
        # Set font for title
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, 'Student Analytics Report', 0, 1, 'C')
        
        # Add student information
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, f"Student: {student_analysis['name']}", 0, 1)
        pdf.set_font('Arial', '', 12)
        pdf.cell(0, 10, f"ID: {student_analysis['student_id']} | Grade: {student_analysis['grade']}", 0, 1)
        pdf.cell(0, 10, f"Report Date: {datetime.now().strftime('%B %d, %Y')}", 0, 1)
        
        # Add summary header
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Executive Summary', 0, 1)
        
        # Add brief summary of key findings
        pdf.set_font('Arial', '', 12)
        
        # Count risk areas
        risk_count = len(student_analysis['pass_analysis'].get('risk_areas', []))
        weakness_count = len(student_analysis['cat4_analysis'].get('weakness_areas', []))
        is_fragile = student_analysis['cat4_analysis'].get('is_fragile_learner', False)
        
        # Summary text
        summary_text = f"This student has {risk_count} PASS risk area(s) and {weakness_count} CAT4 weakness area(s). "
        if is_fragile:
            summary_text += "The student is classified as a Fragile Learner based on CAT4 results. "
        
        # Add intervention count
        intervention_count = len(student_analysis['interventions'])
        summary_text += f"Based on this profile, {intervention_count} intervention strategies are recommended."
        
        # Multi-line cell for summary
        pdf.multi_cell(0, 10, summary_text)
        
        # Add divider
        pdf.ln(5)
        pdf.cell(0, 0, '', 'B', 1)
        pdf.ln(5)
    
    def _add_pass_section(self, pdf, pass_analysis):
        """Add PASS analysis section to the report"""
        # Section title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'PASS Assessment Analysis', 0, 1)
        
        # Create PASS radar chart
        if len(pass_analysis.get('factors', {})) > 0:
            chart_img = self._create_pass_radar_chart(pass_analysis)
            pdf.image(chart_img, x=50, y=pdf.get_y(), w=100)
            pdf.ln(90)  # Move down to add space for the chart
        
        # Add risk areas table
        if pass_analysis.get('risk_areas', []):
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Risk Areas:', 0, 1)
            
            # Table header
            pdf.set_font('Arial', 'B', 10)
            pdf.cell(60, 10, 'Factor', 1, 0, 'C')
            pdf.cell(30, 10, 'Percentile', 1, 0, 'C')
            pdf.cell(100, 10, 'Description', 1, 1, 'C')
            
            # Table content
            pdf.set_font('Arial', '', 10)
            for risk in pass_analysis['risk_areas']:
                factor_name = risk['factor'].replace('_', ' ')
                description = pass_analysis['factors'][risk['factor']]['description']
                pdf.cell(60, 10, factor_name, 1, 0)
                pdf.cell(30, 10, f"{int(risk['percentile'])}%", 1, 0, 'C')
                
                # Handle long descriptions with multi_cell
                x_pos = pdf.get_x()
                y_pos = pdf.get_y()
                pdf.multi_cell(100, 10, description, 1)
                
                # Reset position for next row if not at the end
                if risk != pass_analysis['risk_areas'][-1]:
                    pdf.set_xy(10, pdf.get_y())
        
        # Overall prediction if available
        if pass_analysis.get('prediction', {}).get('overall_risk'):
            pdf.ln(5)
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Overall PASS Profile:', 0, 1)
            
            pdf.set_font('Arial', '', 12)
            risk_level = pass_analysis['prediction']['overall_risk']
            confidence = pass_analysis['prediction']['confidence'] * 100
            pdf.cell(0, 10, f"Risk Level: {risk_level} (Confidence: {confidence:.0f}%)", 0, 1)
        
        # Add divider
        pdf.ln(5)
        pdf.cell(0, 0, '', 'B', 1)
        pdf.ln(5)
    
    def _add_cat4_section(self, pdf, cat4_analysis):
        """Add CAT4 analysis section to the report"""
        # Section title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'CAT4 Cognitive Abilities Analysis', 0, 1)
        
        # Create CAT4 chart
        if len(cat4_analysis.get('domains', {})) > 0:
            chart_img = self._create_cat4_bar_chart(cat4_analysis)
            pdf.image(chart_img, x=30, y=pdf.get_y(), w=140)
            pdf.ln(80)  # Move down to add space for the chart
        
        # Fragile learner status
        pdf.set_font('Arial', 'B', 12)
        fragile_status = "Yes" if cat4_analysis.get('is_fragile_learner', False) else "No"
        pdf.cell(0, 10, f"Fragile Learner Status: {fragile_status}", 0, 1)
        
        # Domain descriptions
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, 'Cognitive Domain Analysis:', 0, 1)
        
        # Table for domain details
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(60, 10, 'Domain', 1, 0, 'C')
        pdf.cell(30, 10, 'Stanine', 1, 0, 'C')
        pdf.cell(30, 10, 'Level', 1, 0, 'C')
        pdf.cell(70, 10, 'Implication', 1, 1, 'C')
        
        # Table content
        pdf.set_font('Arial', '', 10)
        for domain, data in cat4_analysis.get('domains', {}).items():
            domain_name = domain.replace('_', ' ')
            implication = self._get_cat4_implication(domain, data['level'])
            
            pdf.cell(60, 10, domain_name, 1, 0)
            pdf.cell(30, 10, str(data['stanine']), 1, 0, 'C')
            pdf.cell(30, 10, data['level'], 1, 0, 'C')
            
            # Handle long implications with multi_cell
            x_pos = pdf.get_x()
            y_pos = pdf.get_y()
            pdf.multi_cell(70, 10, implication, 1)
            
            # Reset position for next row if not at the end
            domain_list = list(cat4_analysis.get('domains', {}).keys())
            if domain != domain_list[-1]:
                pdf.set_xy(10, pdf.get_y())
        
        # Add divider
        pdf.ln(5)
        pdf.cell(0, 0, '', 'B', 1)
        pdf.ln(5)
    
    def _add_academic_section(self, pdf, academic_analysis):
        """Add academic performance analysis section to the report"""
        # Section title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Academic Performance Analysis', 0, 1)
        
        # Create academic performance chart
        if len(academic_analysis.get('subjects', {})) > 0:
            chart_img = self._create_academic_bar_chart(academic_analysis)
            pdf.image(chart_img, x=30, y=pdf.get_y(), w=140)
            pdf.ln(70)  # Move down to add space for the chart
        
        # CAT4 comparison if available
        if academic_analysis.get('cat4_comparison'):
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Performance Relative to Cognitive Ability:', 0, 1)
            
            # Table header
            pdf.set_font('Arial', 'B', 10)
            pdf.cell(50, 10, 'Subject', 1, 0, 'C')
            pdf.cell(40, 10, 'Performance', 1, 0, 'C')
            pdf.cell(100, 10, 'Interpretation', 1, 1, 'C')
            
            # Table content
            pdf.set_font('Arial', '', 10)
            for subject, comparison in academic_analysis['cat4_comparison'].items():
                interpretation = self._get_cat4_comparison_interpretation(comparison)
                
                pdf.cell(50, 10, subject, 1, 0)
                pdf.cell(40, 10, comparison, 1, 0, 'C')
                pdf.multi_cell(100, 10, interpretation, 1)
                
                # Reset position for next row if not at the end
                subject_list = list(academic_analysis['cat4_comparison'].keys())
                if subject != subject_list[-1]:
                    pdf.set_xy(10, pdf.get_y())
        
        # Add divider
        pdf.ln(5)
        pdf.cell(0, 0, '', 'B', 1)
        pdf.ln(5)
    
    def _add_interventions_section(self, pdf, interventions):
        """Add intervention recommendations section to the report"""
        # Section title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Recommended Intervention Strategies', 0, 1)
        
        # Check if we have interventions
        if not interventions:
            pdf.set_font('Arial', '', 12)
            pdf.cell(0, 10, 'No specific interventions recommended at this time.', 0, 1)
            return
        
        # Group interventions by domain
        domains = {}
        for intervention in interventions:
            domain = intervention['domain'].capitalize()
            if domain not in domains:
                domains[domain] = []
            domains[domain].append(intervention)
        
        # Add each domain's interventions
        for domain, domain_interventions in domains.items():
            # Domain header
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, f"{domain} Interventions:", 0, 1)
            
            # Add each intervention
            for i, intervention in enumerate(domain_interventions):
                # Intervention title with priority
                pdf.set_font('Arial', 'B', 11)
                priority_text = f" (Priority: {intervention['priority'].capitalize()})"
                pdf.cell(0, 10, f"{i+1}. {intervention['title']}{priority_text}", 0, 1)
                
                # Factor/area being addressed
                pdf.set_font('Arial', 'I', 10)
                pdf.cell(0, 8, f"Addressing: {intervention['factor'].replace('_', ' ')}", 0, 1)
                
                # Intervention description
                pdf.set_font('Arial', '', 10)
                pdf.multi_cell(0, 8, intervention['description'])
                
                # Add small spacing between interventions
                pdf.ln(3)
            
            # Add spacing between domains
            pdf.ln(5)
    
    def _create_pass_radar_chart(self, pass_analysis):
        """Create a radar chart for PASS factors"""
        plt.figure(figsize=(8, 8))
        
        # Get the factor data
        factors = list(pass_analysis['factors'].keys())
        factor_names = [factor.replace('_', ' ') for factor in factors]
        percentiles = [pass_analysis['factors'][factor]['percentile'] for factor in factors]
        
        # Calculate angles for radar chart
        angles = np.linspace(0, 2*np.pi, len(factors), endpoint=False).tolist()
        
        # Complete the loop
        percentiles.append(percentiles[0])
        angles.append(angles[0])
        factor_names.append(factor_names[0])
        
        # Set up the radar chart
        ax = plt.subplot(111, polar=True)
        
        # Plot the percentiles
        ax.plot(angles, percentiles, 'o-', linewidth=2, label='Percentile')
        ax.fill(angles, percentiles, alpha=0.25)
        
        # Set the factor labels
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(factor_names[:-1])
        
        # Set y-limits and labels
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80])
        ax.set_yticklabels(['20', '40', '60', '80'])
        
        # Add risk level boundaries
        ax.plot(angles, [40] * len(angles), '--', color='red', alpha=0.7, linewidth=1, label='At Risk Threshold')
        ax.plot(angles, [70] * len(angles), '--', color='green', alpha=0.7, linewidth=1, label='Strength Threshold')
        
        # Add legend
        plt.legend(loc='upper right', bbox_to_anchor=(0.1, 0.1))
        
        # Add title
        plt.title('PASS Factor Profile', size=15, y=1.1)
        
        # Save to bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close()
        buf.seek(0)
        
        return buf
    
    def _create_cat4_bar_chart(self, cat4_analysis):
        """Create a bar chart for CAT4 domains"""
        plt.figure(figsize=(10, 6))
        
        # Get the domain data
        domains = list(cat4_analysis['domains'].keys())
        domain_names = [domain.replace('_', ' ') for domain in domains]
        stanines = [cat4_analysis['domains'][domain]['stanine'] for domain in domains]
        
        # Set up colors based on stanine level
        colors = []
        for domain in domains:
            level = cat4_analysis['domains'][domain]['level']
            if level == 'Weakness':
                colors.append('red')
            elif level == 'Strength':
                colors.append('green')
            else:
                colors.append('blue')
        
        # Create bar chart
        bars = plt.bar(domain_names, stanines, color=colors)
        
        # Add stanine value labels
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                    f'{height}', ha='center', va='bottom')
        
        # Add grid, limits, and labels
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.ylim(0, 10)
        plt.yticks(range(1, 10))
        plt.axhline(y=3.5, color='r', linestyle='--', alpha=0.5, label='Weakness Threshold')
        plt.axhline(y=6.5, color='g', linestyle='--', alpha=0.5, label='Strength Threshold')
        
        # Add legend and title
        plt.legend()
        plt.title('CAT4 Cognitive Profile (Stanine Scores)', size=14)
        plt.ylabel('Stanine (1-9)')
        
        # Save to bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close()
        buf.seek(0)
        
        return buf
    
    def _create_academic_bar_chart(self, academic_analysis):
        """Create a bar chart for academic performance"""
        plt.figure(figsize=(10, 6))
        
        # Get the subject data
        subjects = list(academic_analysis['subjects'].keys())
        marks = [academic_analysis['subjects'][subject]['stanine'] for subject in subjects]
        
        # Set up colors based on level
        colors = []
        for subject in subjects:
            level = academic_analysis['subjects'][subject]['level']
            if level == 'Weakness':
                colors.append('red')
            elif level == 'Strength':
                colors.append('green')
            else:
                colors.append('blue')
        
        # Create bar chart
        bars = plt.bar(subjects, marks, color=colors)
        
        # Add mark labels
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                    f'{height}', ha='center', va='bottom')
        
        # Add CAT4 comparison if available
        if academic_analysis.get('cat4_comparison'):
            # Add markers or annotations for CAT4 comparison
            for i, subject in enumerate(subjects):
                if subject in academic_analysis['cat4_comparison']:
                    comparison = academic_analysis['cat4_comparison'][subject]
                    if comparison == 'Underperforming':
                        plt.text(i, marks[i] - 0.5, '↓', color='red', ha='center', fontsize=16)
                    elif comparison == 'Overperforming':
                        plt.text(i, marks[i] + 0.5, '↑', color='green', ha='center', fontsize=16)
        
        # Add grid, limits, and labels
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.ylim(0, 10)
        plt.yticks(range(1, 10))
        plt.axhline(y=3.5, color='r', linestyle='--', alpha=0.5, label='Weakness Threshold')
        plt.axhline(y=6.5, color='g', linestyle='--', alpha=0.5, label='Strength Threshold')
        
        # Add legend and title
        plt.legend()
        plt.title('Academic Performance (Stanine Equivalent)', size=14)
        plt.ylabel('Stanine (1-9)')
        
        # Save to bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close()
        buf.seek(0)
        
        return buf
    
    def _get_cat4_implication(self, domain, level):
        """Get educational implications based on CAT4 domain and level"""
        implications = {
            'Verbal_Reasoning': {
                'Weakness': 'May struggle with language-based subjects. Consider vocabulary support, reading strategies, and additional time for written work.',
                'Average': 'Typical verbal ability. Can engage with standard curriculum but may benefit from explicit instruction in complex verbal concepts.',
                'Strength': 'Strong verbal skills. Consider extension activities involving advanced texts, debates, and creative writing.'
            },
            'Quantitative_Reasoning': {
                'Weakness': 'May find numerical concepts challenging. Consider concrete representations, step-by-step procedures, and frequent review.',
                'Average': 'Typical numerical ability. Can engage with standard mathematical curriculum with appropriate support for complex concepts.',
                'Strength': 'Strong numerical skills. Consider extension with complex problem-solving, mathematical investigations, and advanced concepts.'
            },
            'Nonverbal_Reasoning': {
                'Weakness': 'May struggle with abstract concepts and patterns. Consider visual supports, concrete examples, and explicit connections.',
                'Average': 'Typical ability with patterns and abstract thinking. Can engage with standard curriculum with scaffolding for complex concepts.',
                'Strength': 'Strong abstract reasoning. Consider extension with complex patterns, scientific investigations, and logical puzzles.'
            },
            'Spatial_Reasoning': {
                'Weakness': 'May find spatial tasks challenging. Consider additional support with diagrams, physical models, and step-by-step visual instructions.',
                'Average': 'Typical spatial ability. Can engage with standard curriculum involving diagrams, maps, and basic 3D concepts.',
                'Strength': 'Strong spatial skills. Consider extension with advanced design tasks, 3D modeling, and complex visual problem-solving.'
            }
        }
        
        return implications[domain][level]
    
    def _get_cat4_comparison_interpretation(self, comparison):
        """Get interpretation of academic performance compared to CAT4 potential"""
        interpretations = {
            'Underperforming': 'Student is performing below their cognitive potential. Consider motivational factors, learning barriers, or external circumstances affecting performance.',
            'Overperforming': 'Student is performing above their measured cognitive potential. Consider strong work ethic, effective study strategies, or high motivation in this subject.',
            'As Expected': 'Student is performing in line with their cognitive profile. Continue with current support strategies.'
        }
        
        return interpretations[comparison]
    
    def create_data_upload_form(self):
        """Create an HTML form for data upload"""
        html = """
        <div class="upload-container">
            <h2>Upload Student Data Files</h2>
            <form id="data-upload-form">
                <div class="file-group">
                    <label>PASS Assessment Data (CSV/Excel):</label>
                    <input type="file" name="pass_file" accept=".csv,.xlsx,.xls">
                </div>
                <div class="file-group">
                    <label>CAT4 Assessment Data (CSV/Excel):</label>
                    <input type="file" name="cat4_file" accept=".csv,.xlsx,.xls">
                </div>
                <div class="file-group">
                    <label>Academic Marks Data (CSV/Excel):</label>
                    <input type="file" name="academic_file" accept=".csv,.xlsx,.xls">
                </div>
                <button type="submit" class="submit-btn">Process Data</button>
            </form>
            <div id="processing-status"></div>
        </div>
        
        <style>
            .upload-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h2 {
                color: #333;
                margin-bottom: 20px;
            }
            .file-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            input[type="file"] {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: white;
            }
            .submit-btn {
                background-color: #4CAF50;
                color: white;
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            .submit-btn:hover {
                background-color: #45a049;
            }
            #processing-status {
                margin-top: 20px;
                padding: 10px;
                border-radius: 4px;
            }
        </style>
        
        <script>
            document.getElementById('data-upload-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const status = document.getElementById('processing-status');
                
                status.innerHTML = '<p>Processing data, please wait...</p>';
                status.style.backgroundColor = '#e8f5e9';
                
                // In a real implementation, this would make an API call to the server
                // For the PoC, we'll simulate processing
                setTimeout(function() {
                    status.innerHTML = '<p>Data processed successfully! Redirecting to results...</p>';
                    
                    // Simulate redirection to results page
                    setTimeout(function() {
                        window.location.href = '/results.html';  // This would be your results page
                    }, 2000);
                }, 3000);
            });
        </script>
        """
        
        return html
        
# Main execution code for standalone app
if __name__ == "__main__":
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Student Analytics Engine PoC')
    parser.add_argument('--pass_file', type=str, help='Path to PASS data file (CSV or Excel)')
    parser.add_argument('--cat4_file', type=str, help='Path to CAT4 data file (CSV or Excel)')
    parser.add_argument('--academic_file', type=str, help='Path to academic data file (CSV or Excel)')
    parser.add_argument('--output_dir', type=str, default='reports', help='Directory to save output reports')
    parser.add_argument('--web', action='store_true', help='Start web interface')
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
    
    # Initialize the analytics engine
    engine = StudentAnalyticsEngine()
    
    if args.web:
        # Start web application
        from flask import Flask, request, jsonify, render_template, send_file
        import tempfile
        import uuid
        
        app = Flask(__name__)
        
        @app.route('/')
        def home():
            return render_template('index.html')
        
        @app.route('/upload', methods=['POST'])
        def upload_files():
            # Get uploaded files
            pass_file = request.files.get('pass_file')
            cat4_file = request.files.get('cat4_file')
            academic_file = request.files.get('academic_file')
            
            # Save files temporarily
            temp_files = {}
            for name, file_obj in [('pass_file', pass_file), ('cat4_file', cat4_file), ('academic_file', academic_file)]:
                if file_obj:
                    _, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file_obj.filename)[1])
                    file_obj.save(temp_path)
                    temp_files[name] = temp_path
            
            # Process the data
            results = engine.process_student_files(
                temp_files.get('pass_file'),
                temp_files.get('cat4_file'),
                temp_files.get('academic_file')
            )
            
            # Clean up temp files
            for temp_path in temp_files.values():
                try:
                    os.remove(temp_path)
                except:
                    pass
            
            # Store results in session or database (simplified for PoC)
            session_id = str(uuid.uuid4())
            app.config[f'results_{session_id}'] = results
            
            return jsonify({
                'status': 'success',
                'session_id': session_id,
                'summary': {
                    'total_students': len(results['students']),
                    'grade_levels': list(results['grade_level_summary'].keys())
                }
            })
        
        @app.route('/results/<session_id>')
        def show_results(session_id):
            results = app.config.get(f'results_{session_id}')
            if not results:
                return "Session expired or not found", 404
            
            return render_template('results.html', results=results)
        
        @app.route('/student/<session_id>/<student_id>')
        def show_student(session_id, student_id):
            results = app.config.get(f'results_{session_id}')
            if not results:
                return "Session expired or not found", 404
            
            # Find the student in results
            student = next((s for s in results['students'] if s['student_id'] == student_id), None)
            if not student:
                return "Student not found", 404
            
            return render_template('student.html', student=student)
        
        @app.route('/report/<session_id>/<student_id>')
        def download_report(session_id, student_id):
            results = app.config.get(f'results_{session_id}')
            if not results:
                return "Session expired or not found", 404
            
            # Find the student in results
            student = next((s for s in results['students'] if s['student_id'] == student_id), None)
            if not student:
                return "Student not found", 404
            
            # Generate PDF report
            report_generator = StudentReportGenerator()
            pdf_bytes = report_generator.generate_report(student)
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(pdf_bytes)
                temp_path = temp_file.name
            
            return send_file(
                temp_path,
                as_attachment=True,
                download_name=f"Student_Report_{student['name'].replace(' ', '_')}.pdf",
                mimetype='application/pdf'
            )
        
        # Start the Flask app
        app.run(debug=True, port=5000)
        
    else:
        # Command line mode
        if not any([args.pass_file, args.cat4_file, args.academic_file]):
            print("Error: At least one input file must be provided")
            parser.print_help()
            sys.exit(1)
        
        # Process the files
        results = engine.process_student_files(args.pass_file, args.cat4_file, args.academic_file)
        
        # Generate reports for each student
        report_generator = StudentReportGenerator()
        for student in results['students']:
            pdf_bytes = report_generator.generate_report(student)
            
            # Save the report
            filename = f"{args.output_dir}/{student['student_id']}_{student['name'].replace(' ', '_')}.pdf"
            with open(filename, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"Generated report: {filename}")
        
        print(f"Processing complete. {len(results['students'])} student reports generated in {args.output_dir}")