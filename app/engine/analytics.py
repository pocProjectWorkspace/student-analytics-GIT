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
                    },
                    {
                        'title': 'Mentorship Assignment',
                        'description': 'Pair student with a staff member who can serve as a mentor and demonstrate positive teacher relationships.',
                        'priority': 'medium'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Regular Check-ins',
                        'description': 'Schedule brief bi-weekly check-ins with a favorite teacher to maintain positive connection.',
                        'priority': 'low'
                    }
                ]
            },
            'General_Work_Ethic': {
                'At Risk': [
                    {
                        'title': 'Academic Coaching',
                        'description': 'Weekly sessions to develop organizational skills, time management, and task prioritization strategies.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Goal Setting Framework',
                        'description': 'Implement SMART goal system with regular progress monitoring and incentives for completion.',
                        'priority': 'high'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Task Management System',
                        'description': 'Introduce student to digital or physical planning tools to manage assignments and deadlines more effectively.',
                        'priority': 'medium'
                    }
                ]
            },
            'Emotional_Control': {
                'At Risk': [
                    {
                        'title': 'Emotional Regulation Therapy',
                        'description': 'Counselor-led sessions focused on identifying emotional triggers and developing healthy coping mechanisms.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Safe Space Protocol',
                        'description': 'Establish procedure for student to access quiet space or trusted adult when feeling overwhelmed.',
                        'priority': 'high'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Mindfulness Practice',
                        'description': 'Introduce basic mindfulness techniques to help maintain emotional balance in challenging situations.',
                        'priority': 'medium'
                    }
                ]
            },
            'Social_Confidence': {
                'At Risk': [
                    {
                        'title': 'Social Skills Group',
                        'description': 'Small group sessions focusing on conversational skills, friendship building, and navigating social situations.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Structured Social Opportunities',
                        'description': 'Create low-pressure opportunities for positive peer interaction through structured activities matching student interests.',
                        'priority': 'medium'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Leadership Opportunity',
                        'description': 'Identify a comfortable leadership role in an area of interest to build confidence and social standing.',
                        'priority': 'low'
                    }
                ]
            },
            'Curriculum_Demand': {
                'At Risk': [
                    {
                        'title': 'Curriculum Scaffolding',
                        'description': 'Provide additional supports through modified assignments, extended deadlines, or supplementary resources.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Study Skills Training',
                        'description': 'Direct instruction in subject-specific study strategies, note-taking techniques, and test preparation.',
                        'priority': 'high'
                    }
                ],
                'Balanced': [
                    {
                        'title': 'Preview and Review Sessions',
                        'description': 'Offer optional sessions before and after units to reinforce understanding and address questions.',
                        'priority': 'medium'
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
                    },
                    {
                        'title': 'Language Scaffolding',
                        'description': 'Provide word banks, sentence starters, and structured discussion frameworks to support verbal processing.',
                        'priority': 'medium'
                    }
                ]
            },
            'Quantitative_Reasoning': {
                'Weakness': [
                    {
                        'title': 'Numeracy Intervention',
                        'description': 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Visual Math Strategies',
                        'description': 'Incorporate visual representations, manipulatives, and real-world applications to strengthen quantitative understanding.',
                        'priority': 'medium'
                    }
                ]
            },
            'Nonverbal_Reasoning': {
                'Weakness': [
                    {
                        'title': 'Pattern Recognition Training',
                        'description': 'Activities focused on identifying patterns, relationships, and solving abstract problems without language.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Visual Thinking Tools',
                        'description': 'Teach use of mind maps, graphic organizers, and visual planning tools to leverage nonverbal thinking.',
                        'priority': 'medium'
                    }
                ]
            },
            'Spatial_Reasoning': {
                'Weakness': [
                    {
                        'title': 'Spatial Skills Activities',
                        'description': 'Structured practice with mental rotation, spatial visualization, and understanding 3D relationships.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Hands-on Construction Tasks',
                        'description': 'Regular opportunities to build, manipulate, and create using blocks, models, or digital design tools.',
                        'priority': 'medium'
                    }
                ]
            },
            'Fragile_Learner': {
                'Yes': [
                    {
                        'title': 'Comprehensive Learning Support',
                        'description': 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Learning Skills Integration',
                        'description': 'Explicit teaching of learning strategies across curriculum areas with regular monitoring and reinforcement.',
                        'priority': 'high'
                    },
                    {
                        'title': 'Multimodal Instruction',
                        'description': 'Ensure teaching incorporates visual, auditory, and kinesthetic elements to support cognitive processing.',
                        'priority': 'medium'
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
                },
                {
                    'title': 'Differentiated Instruction',
                    'description': 'Collaborate with teachers to implement differentiated approaches addressing specific learning needs.',
                    'priority': 'high'
                }
            ],
            'Underperforming': [
                {
                    'title': 'Motivation Strategy',
                    'description': 'Implement interest-based learning opportunities and meaningful goal-setting to increase engagement with subject.',
                    'priority': 'high'
                },
                {
                    'title': 'Success Coaching',
                    'description': 'Regular check-ins to address barriers to achievement and develop strategies for maximizing cognitive potential.',
                    'priority': 'medium'
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
    
    def train_models(self, data):
        """Train predictive models using provided or synthetic data"""
        # For PoC, we'll use synthetic data if real training data isn't available
        if data is None:
            # Generate synthetic training data
            data = self._generate_synthetic_training_data()
        
        # Train PASS risk prediction model
        pass_features = ['Self_Regard', 'Attitude_Teachers', 'General_Work_Ethic', 
                         'Emotional_Control', 'Social_Confidence', 'Curriculum_Demand']
        X_pass = data[pass_features]
        y_pass = data['Risk_Label']
        self.pass_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.pass_model.fit(X_pass, y_pass)
        
        # Train academic performance model
        academic_features = ['Verbal_Reasoning', 'Quantitative_Reasoning', 
                            'Nonverbal_Reasoning', 'Spatial_Reasoning']
        X_academic = data[academic_features]
        y_academic = data['Academic_Performance']
        self.academic_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.academic_model.fit(X_academic, y_academic)
        
        return {
            'pass_model_accuracy': self.pass_model.score(X_pass, y_pass),
            'academic_model_accuracy': self.academic_model.score(X_academic, y_academic)
        }
    
    def _generate_synthetic_training_data(self, n_samples=1000):
        """Generate synthetic data for model training when real data isn't available"""
        # Generate random PASS scores (percentiles 1-100)
        pass_factors = ['Self_Regard', 'Attitude_Teachers', 'General_Work_Ethic', 
                        'Emotional_Control', 'Social_Confidence', 'Curriculum_Demand']
        data = pd.DataFrame()
        
        # Generate PASS factors (more realistic distribution)
        for factor in pass_factors:
            # Create a slightly skewed distribution toward higher percentiles
            data[factor] = np.clip(np.random.normal(60, 20, n_samples), 1, 99).astype(int)
        
        # Generate CAT4 scores (stanines 1-9)
        cat4_domains = ['Verbal_Reasoning', 'Quantitative_Reasoning', 
                        'Nonverbal_Reasoning', 'Spatial_Reasoning']
        for domain in cat4_domains:
            # Create a normal distribution centered around stanine 5
            data[domain] = np.clip(np.random.normal(5, 2, n_samples), 1, 9).astype(int)
        
        # Generate subject marks (e.g., on a 1-9 scale similar to stanines)
        subjects = ['English_Marks', 'Math_Marks', 'Science_Marks', 'Humanities_Marks']
        for subject in subjects:
            data[subject] = np.clip(np.random.normal(5, 2, n_samples), 1, 9).astype(int)
        
        # Create risk labels based on PASS scores
        # If more than 2 factors are below 40, label as "At Risk"
        # If more than 3 factors are above 70, label as "Strength"
        # Otherwise, label as "Balanced"
        risk_conditions = []
        for i in range(n_samples):
            low_factors = sum(1 for factor in pass_factors if data.loc[i, factor] < 40)
            high_factors = sum(1 for factor in pass_factors if data.loc[i, factor] > 70)
            
            if low_factors >= 2:
                risk_conditions.append("At Risk")
            elif high_factors >= 3:
                risk_conditions.append("Strength")
            else:
                risk_conditions.append("Balanced")
        
        data['Risk_Label'] = risk_conditions
        
        # Create academic performance labels based on CAT4 and subject marks
        # Compare predicted performance (from CAT4) with actual performance (subject marks)
        academic_conditions = []
        for i in range(n_samples):
            # Average CAT4 scores as predictor of expected performance
            expected_performance = np.mean([data.loc[i, domain] for domain in cat4_domains])
            # Average subject marks as indicator of actual performance
            actual_performance = np.mean([data.loc[i, subject] for subject in subjects])
            
            # Determine if student is performing as expected based on cognitive abilities
            diff = actual_performance - expected_performance
            if diff < -1.5:
                academic_conditions.append("Underperforming")
            elif diff > 1.5:
                academic_conditions.append("Overperforming")
            else:
                academic_conditions.append("As Expected")
        
        data['Academic_Performance'] = academic_conditions
        
        return data
    
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
        """Preprocess PASS data for analysis"""
        # This is a simplified version - in production, this would handle real data formats
        # For the PoC, we'll assume the data is already in the correct format
        
        # Ensure standard column names
        column_mapping = {
            'Student ID': 'student_id',
            'Name': 'student_name',
            'Grade': 'grade',
            'Self-Regard': 'Self_Regard',
            'Perceived Learning Capability': 'Perceived_Learning',
            'Attitude to Teachers': 'Attitude_Teachers',
            'General Work Ethic': 'General_Work_Ethic',
            'Confidence in Learning': 'Learning_Confidence',
            'Preparedness for Learning': 'Preparedness',
            'Emotional Control': 'Emotional_Control',
            'Social Confidence': 'Social_Confidence',
            'Response to Curriculum Demands': 'Curriculum_Demand'
        }
        
        # Try to map columns if they exist, otherwise keep original
        data = data.rename(columns={col: column_mapping.get(col, col) for col in data.columns})
        
        return data
    
    def _preprocess_cat4_data(self, data):
        """Preprocess CAT4 data for analysis"""
        # Similar to PASS preprocessing, adapted for CAT4 format
        column_mapping = {
            'Student ID': 'student_id',
            'Name': 'student_name',
            'Verbal Reasoning': 'Verbal_Reasoning',
            'Quantitative Reasoning': 'Quantitative_Reasoning',
            'Non-verbal Reasoning': 'Nonverbal_Reasoning',
            'Spatial Ability': 'Spatial_Reasoning'
        }
        
        data = data.rename(columns={col: column_mapping.get(col, col) for col in data.columns})
        
        return data
    
    def _preprocess_academic_data(self, data):
        """Preprocess academic data for analysis"""
        # Process internal academic marks data
        column_mapping = {
            'Student ID': 'student_id',
            'Name': 'student_name',
            'English': 'English_Marks',
            'Mathematics': 'Math_Marks',
            'Science': 'Science_Marks',
            'Humanities': 'Humanities_Marks'
        }
        
        data = data.rename(columns={col: column_mapping.get(col, col) for col in data.columns})
        
        return data
    
    def _merge_datasets(self, pass_data, cat4_data, academic_data):
        """Merge multiple datasets on student ID"""
        # Create a base dataframe with student IDs
        if pass_data is not None:
            merged = pass_data.copy()
        elif cat4_data is not None:
            merged = cat4_data.copy()
        elif academic_data is not None:
            merged = academic_data.copy()
        else:
            # No data provided, return empty dataframe
            return pd.DataFrame()
        
        # Join with other datasets if available
        if cat4_data is not None and 'student_id' in cat4_data.columns and pass_data is not None:
            merged = pd.merge(merged, cat4_data, on='student_id', how='outer', suffixes=('', '_cat4'))
        
        if academic_data is not None and 'student_id' in academic_data.columns:
            merged = pd.merge(merged, academic_data, on='student_id', how='outer', suffixes=('', '_academic'))
        
        # Handle duplicate columns from merging
        for col in merged.columns:
            if col.endswith('_cat4') or col.endswith('_academic'):
                base_col = col.split('_')[0]
                if base_col in merged.columns:
                    # Use the value from the original column if not null, otherwise use the merged column
                    merged[base_col] = merged[base_col].combine_first(merged[col])
                    merged = merged.drop(columns=[col])
        
        return merged
    
    def triangulate_student_data(self, student_analysis):
        """
        Triangulate data from PASS, CAT4, and academic sources to create holistic insights.
        This method identifies fragile learners and creates a comprehensive view of the student.
        """
        # Extract the individual analyses
        pass_analysis = student_analysis.get('pass_analysis', {'available': False})
        cat4_analysis = student_analysis.get('cat4_analysis', {'available': False})
        academic_analysis = student_analysis.get('academic_analysis', {'available': False})
        
        # Initialize the triangulated results
        triangulated_results = {
            'student_id': student_analysis.get('student_id', 'unknown'),
            'name': student_analysis.get('name', 'Unknown Student'),
            'grade': student_analysis.get('grade', 'unknown'),
            'is_fragile_learner': False,
            'risk_profile': 'Low',
            'top_strengths': [],
            'top_weaknesses': [],
            'intervention_priorities': [],
            'learning_profile': {}
        }
        
        # Identify fragile learners based on CAT4 and PASS data
        # According to the instruction set, a fragile learner has:
        # 1. Cognitive ability (CAT4 SAS >= 90 in 2+ domains)
        # 2. Poor attitudes (PASS factors < 45)
        if cat4_analysis.get('available', False) and pass_analysis.get('available', False):
            # Check if student has cognitive potential but attitudinal barriers
            cognitive_potential = False
            attitudinal_barriers = False
            
            # Check for cognitive potential - at least 2 domains with SAS >= 90
            if cat4_analysis.get('available', False):
                strong_domains = sum(1 for domain in cat4_analysis.get('domains', {}).values() 
                                if domain.get('sas', 0) >= 90)
                cognitive_potential = strong_domains >= 2
                
                # Also check if the student is already flagged as a fragile learner
                if cat4_analysis.get('is_fragile_learner', False):
                    triangulated_results['is_fragile_learner'] = True
            
            # Check for attitudinal barriers - at least 2 PASS factors < 45
            if pass_analysis.get('available', False):
                attitudinal_risks = len(pass_analysis.get('risk_areas', []))
                attitudinal_barriers = attitudinal_risks >= 2
            
            # Define fragile learner based on the combination
            # A true fragile learner has cognitive potential BUT attitudinal barriers
            if cognitive_potential and attitudinal_barriers:
                triangulated_results['is_fragile_learner'] = True
        
        # Gather top strengths across all assessments
        top_strengths = []
        
        # Add PASS strengths
        if pass_analysis.get('available', False):
            for strength in pass_analysis.get('strength_areas', []):
                top_strengths.append({
                    'domain': 'PASS',
                    'factor': strength.get('factor', ''),
                    'level': strength.get('level', ''),
                    'value': strength.get('percentile', 0),
                    'description': f"Strong attitude in {strength.get('factor', '')}"
                })
        
        # Add CAT4 strengths
        if cat4_analysis.get('available', False):
            for strength in cat4_analysis.get('strength_areas', []):
                top_strengths.append({
                    'domain': 'CAT4',
                    'factor': strength.get('domain', ''),
                    'level': strength.get('level', ''),
                    'value': strength.get('sas', 0),
                    'description': f"Strong cognitive ability in {strength.get('domain', '')}"
                })
        
        # Add academic strengths
        if academic_analysis.get('available', False):
            for subject, data in academic_analysis.get('subjects', {}).items():
                if data.get('level', '') == 'Strength':
                    top_strengths.append({
                        'domain': 'Academic',
                        'factor': subject,
                        'level': data.get('level', ''),
                        'value': data.get('stanine', 0),
                        'description': f"Strong performance in {subject}"
                    })
        
        # Sort strengths by value (highest first) and take top 5
        top_strengths.sort(key=lambda x: x['value'], reverse=True)
        triangulated_results['top_strengths'] = top_strengths[:5]
        
        # Gather top weaknesses across all assessments
        top_weaknesses = []
        
        # Add PASS risks
        if pass_analysis.get('available', False):
            for risk in pass_analysis.get('risk_areas', []):
                top_weaknesses.append({
                    'domain': 'PASS',
                    'factor': risk.get('factor', ''),
                    'level': risk.get('level', ''),
                    'value': risk.get('percentile', 0),
                    'description': f"At risk attitude in {risk.get('factor', '')}"
                })
        
        # Add CAT4 weaknesses
        if cat4_analysis.get('available', False):
            for weakness in cat4_analysis.get('weakness_areas', []):
                top_weaknesses.append({
                    'domain': 'CAT4',
                    'factor': weakness.get('domain', ''),
                    'level': weakness.get('level', ''),
                    'value': weakness.get('sas', 0),
                    'description': f"Cognitive weakness in {weakness.get('domain', '')}"
                })
        
        # Add academic weaknesses
        if academic_analysis.get('available', False):
            for subject, data in academic_analysis.get('subjects', {}).items():
                if data.get('level', '') == 'Weakness':
                    top_weaknesses.append({
                        'domain': 'Academic',
                        'factor': subject,
                        'level': data.get('level', ''),
                        'value': data.get('stanine', 0),
                        'description': f"Struggling in {subject}"
                    })
        
        # Sort weaknesses by value (lowest first) and take top 5
        top_weaknesses.sort(key=lambda x: x['value'])
        triangulated_results['top_weaknesses'] = top_weaknesses[:5]
        
        # Create a comprehensive learning profile
        learning_profile = {
            'cognitive_style': self._determine_cognitive_style(cat4_analysis),
            'learning_attitudes': self._determine_learning_attitudes(pass_analysis),
            'academic_performance': self._determine_academic_profile(academic_analysis),
            'gap_analysis': self._perform_gap_analysis(cat4_analysis, academic_analysis)
        }
        triangulated_results['learning_profile'] = learning_profile
        
        # Determine overall risk profile
        risk_score = self._calculate_risk_score(pass_analysis, cat4_analysis, academic_analysis)
        if risk_score >= 7:
            triangulated_results['risk_profile'] = 'High'
        elif risk_score >= 4:
            triangulated_results['risk_profile'] = 'Medium'
        else:
            triangulated_results['risk_profile'] = 'Low'
        
        # Determine intervention priorities
        triangulated_results['intervention_priorities'] = self._determine_intervention_priorities(
            pass_analysis, cat4_analysis, academic_analysis, triangulated_results['is_fragile_learner']
        )
        
        return triangulated_results

    def _determine_cognitive_style(self, cat4_analysis):
        """Determine the student's cognitive learning style based on CAT4 results"""
        if not cat4_analysis.get('available', False):
            return 'Unknown'
        
        domains = cat4_analysis.get('domains', {})
        
        # Get stanine values
        verbal = domains.get('Verbal_Reasoning', {}).get('stanine', 5)
        quant = domains.get('Quantitative_Reasoning', {}).get('stanine', 5)
        nonverbal = domains.get('Nonverbal_Reasoning', {}).get('stanine', 5)
        spatial = domains.get('Spatial_Reasoning', {}).get('stanine', 5)
        
        # Determine verbal vs. non-verbal preference
        verbal_score = verbal + quant
        nonverbal_score = nonverbal + spatial
        
        if verbal_score > nonverbal_score + 2:
            style = 'Verbal'
        elif nonverbal_score > verbal_score + 2:
            style = 'Non-verbal'
        else:
            style = 'Balanced'
        
        # Additional modifiers
        if spatial >= 7 and verbal <= 4:
            style += '/Visual'
        elif quant >= 7 and spatial <= 4:
            style += '/Analytical'
        
        return style

    def _determine_learning_attitudes(self, pass_analysis):
        """Determine the student's learning attitudes based on PASS results"""
        if not pass_analysis.get('available', False):
            return 'Unknown'
        
        factors = pass_analysis.get('factors', {})
        
        # Check key attitude factors
        self_regard = factors.get('Self_Regard', {}).get('percentile', 50)
        work_ethic = factors.get('General_Work_Ethic', {}).get('percentile', 50)
        
        # Determine basic attitude profile
        if self_regard < 45 and work_ethic < 45:
            attitude = 'Disengaged'
        elif self_regard < 45 and work_ethic >= 45:
            attitude = 'Lacking Confidence'
        elif self_regard >= 45 and work_ethic < 45:
            attitude = 'Underachieving'
        else:
            attitude = 'Positive'
        
        # Add modifiers based on other factors
        emotional_control = factors.get('Emotional_Control', {}).get('percentile', 50)
        if emotional_control < 45:
            attitude += ' with Emotional Barriers'
        
        return attitude

    def _determine_academic_profile(self, academic_analysis):
        """Determine the student's academic profile based on subject performance"""
        if not academic_analysis.get('available', False):
            return 'Unknown'
        
        subjects = academic_analysis.get('subjects', {})
        if not subjects:
            return 'Unknown'
        
        # Calculate average stanine across subjects
        stanines = [data.get('stanine', 5) for data in subjects.values()]
        avg_stanine = sum(stanines) / len(stanines) if stanines else 5
        
        # Determine profile based on average stanine
        if avg_stanine >= 7:
            profile = 'High Achieving'
        elif avg_stanine >= 4:
            profile = 'Average'
        else:
            profile = 'Struggling'
        
        # Add subject-specific modifiers
        strengths = [subject for subject, data in subjects.items() if data.get('level', '') == 'Strength']
        weaknesses = [subject for subject, data in subjects.items() if data.get('level', '') == 'Weakness']
        
        if strengths:
            profile += f", Strong in {', '.join(strengths[:2])}"
        if weaknesses:
            profile += f", Weak in {', '.join(weaknesses[:2])}"
        
        return profile

    def _perform_gap_analysis(self, cat4_analysis, academic_analysis):
        """
        Analyze the gap between cognitive potential (CAT4) and actual academic performance
        to identify underachievement or overachievement
        """
        if not cat4_analysis.get('available', False) or not academic_analysis.get('available', False):
            return 'Insufficient data'
        
        # Get average CAT4 stanine
        cat4_domains = cat4_analysis.get('domains', {})
        cat4_stanines = [domain.get('stanine', 5) for domain in cat4_domains.values()]
        avg_cat4 = sum(cat4_stanines) / len(cat4_stanines) if cat4_stanines else 5
        
        # Get average academic stanine
        academic_subjects = academic_analysis.get('subjects', {})
        academic_stanines = [data.get('stanine', 5) for data in academic_subjects.values()]
        avg_academic = sum(academic_stanines) / len(academic_stanines) if academic_stanines else 5
        
        # Calculate the gap
        gap = avg_academic - avg_cat4
        
        # Determine the gap profile
        if gap >= 1.5:
            return 'Overachieving - performing better than cognitive profile suggests'
        elif gap <= -1.5:
            return 'Underachieving - not reaching cognitive potential'
        else:
            return 'Performing as expected - achievement matches cognitive profile'

    def _calculate_risk_score(self, pass_analysis, cat4_analysis, academic_analysis):
        """Calculate an overall risk score (0-10) based on all data sources"""
        risk_score = 0
        
        # Add points for PASS risks
        if pass_analysis.get('available', False):
            risk_areas = pass_analysis.get('risk_areas', [])
            # Each risk area adds 1 point, up to 3 max
            risk_score += min(len(risk_areas), 3)
        
        # Add points for CAT4 weaknesses and fragile learner status
        if cat4_analysis.get('available', False):
            weakness_areas = cat4_analysis.get('weakness_areas', [])
            # Each weakness adds 0.5 points, up to 2 max
            risk_score += min(len(weakness_areas) * 0.5, 2)
            
            # Fragile learner adds 2 points
            if cat4_analysis.get('is_fragile_learner', False):
                risk_score += 2
        
        # Add points for academic weaknesses
        if academic_analysis.get('available', False):
            academic_subjects = academic_analysis.get('subjects', {})
            weaknesses = sum(1 for data in academic_subjects.values() if data.get('level', '') == 'Weakness')
            # Each academic weakness adds 1 point, up to 3 max
            risk_score += min(weaknesses, 3)
        
        return risk_score

    def _determine_intervention_priorities(self, pass_analysis, cat4_analysis, academic_analysis, is_fragile_learner):
        """
        Determine intervention priorities based on the instruction set mapping
        and student's specific needs
        """
        priorities = []
        
        # Map PASS domains to instruction set P numbers
        pass_to_p_mapping = {
            'Self_Regard': 'P3',
            'Perceived_Learning': 'P1',
            'Attitude_Teachers': 'P4',
            'General_Work_Ethic': 'P6',
            'Confidence_Learning': 'P2',
            'Preparedness': 'P8',
            'Emotional_Control': 'P7',
            'Social_Confidence': 'P9',
            'Curriculum_Demand': 'P5'
        }
        
        # Check PASS risks and map to interventions according to instruction set
        if pass_analysis.get('available', False):
            for risk in pass_analysis.get('risk_areas', []):
                factor = risk.get('factor', '')
                p_code = pass_to_p_mapping.get(factor, '')
                
                # Apply instruction set mapping logic
                if p_code in ['P3', 'P7']:
                    priorities.append({
                        'domain': 'Emotional',
                        'focus': 'Self-esteem/confidence building',
                        'trigger': f"{factor} at risk (score: {risk.get('percentile', 0)})",
                        'priority': 'High' if risk.get('percentile', 0) < 35 else 'Medium'
                    })
                elif p_code in ['P4', 'P6']:
                    priorities.append({
                        'domain': 'Behavioral',
                        'focus': 'Time management / Organization skills',
                        'trigger': f"{factor} at risk (score: {risk.get('percentile', 0)})",
                        'priority': 'Medium'
                    })
                elif p_code in ['P5', 'P8']:
                    priorities.append({
                        'domain': 'Engagement',
                        'focus': 'Attendance and engagement mentoring',
                        'trigger': f"{factor} at risk (score: {risk.get('percentile', 0)})",
                        'priority': 'Medium'
                    })
        
        # Check CAT4 for verbal reasoning weakness
        if cat4_analysis.get('available', False):
            verbal_domain = cat4_analysis.get('domains', {}).get('Verbal_Reasoning', {})
            if verbal_domain.get('sas', 100) < 90:
                priorities.append({
                    'domain': 'Cognitive',
                    'focus': 'Verbal reasoning / reading boosters',
                    'trigger': f"Verbal Reasoning SAS: {verbal_domain.get('sas', 0)}",
                    'priority': 'High'
                })
        
        # Add fragile learner intervention
        if is_fragile_learner:
            priorities.append({
                'domain': 'Holistic',
                'focus': 'Holistic learning support',
                'trigger': 'Fragile learner (cognitive potential with attitudinal barriers)',
                'priority': 'High'
            })
        
        # Check academic weaknesses
        if academic_analysis.get('available', False):
            academic_subjects = academic_analysis.get('subjects', {})
            for subject, data in academic_subjects.items():
                if data.get('level', '') == 'Weakness':
                    priorities.append({
                        'domain': 'Academic',
                        'focus': f'Subject-specific booster modules for {subject}',
                        'trigger': f"{subject} stanine: {data.get('stanine', 0)}",
                        'priority': 'High' if data.get('stanine', 0) <= 2 else 'Medium'
                    })
        
        # Sort priorities by priority level (High first)
        priority_order = {'High': 0, 'Medium': 1, 'Low': 2}
        priorities.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return priorities


    def _analyze_student_data(self, data):
        """Perform comprehensive analysis on student data"""
        results = {
            'grade_level_summary': {},
            'students': []
        }
        
        if data.empty:
            return results
        
        # Process each student in the data
        for _, student_row in data.iterrows():
            student_analysis = self._analyze_individual_student(student_row)
            results['students'].append(student_analysis)
        
        # Compute grade-level summaries
        if 'grade' in data.columns:
            for grade in data['grade'].unique():
                grade_data = data[data['grade'] == grade]
                results['grade_level_summary'][str(grade)] = self._compute_grade_summary(grade_data)
        
        return results

    def _analyze_individual_student(self, student_data):
        """Analyze data for an individual student"""
        student_id = student_data.get('student_id', 'unknown')
        student_name = student_data.get('student_name', f'Student {student_id}')
        grade = student_data.get('grade', 'unknown')
        
        # Perform individual analyses
        pass_analysis = self._analyze_pass_data(student_data)
        cat4_analysis = self._analyze_cat4_data(student_data)
        academic_analysis = self._analyze_academic_data(student_data)
        
        # Create the base student analysis
        student_analysis = {
            'student_id': student_id,
            'name': student_name,
            'grade': grade,
            'pass_analysis': pass_analysis,
            'cat4_analysis': cat4_analysis,
            'academic_analysis': academic_analysis,
        }
        
        # Perform triangulated analysis
        triangulated_results = self.triangulate_student_data(student_analysis)
        student_analysis['triangulated_analysis'] = triangulated_results
        
        # Generate interventions
        student_analysis['interventions'] = self._recommend_interventions(
            pass_analysis, cat4_analysis, academic_analysis, triangulated_results['is_fragile_learner']
        )
        
        return student_analysis
    
    def _analyze_pass_data(self, student_data):
        """Analyze PASS data for a student"""
        # PASS factors to analyze
        pass_factors = ['Self_Regard', 'Perceived_Learning', 'Attitude_Teachers', 
                   'General_Work_Ethic', 'Confidence_Learning', 'Preparedness',
                   'Emotional_Control', 'Social_Confidence', 'Curriculum_Demand']
    
        # Check if we have PASS data for this student
        if not any(factor in student_data for factor in pass_factors):
            return {
                'available': False,
                'message': 'No PASS data available for this student.'
            }
        
        # Extract available PASS factors
        available_factors = {}
        risk_areas = []
        strength_areas = []
        
        for factor in pass_factors:
            if factor in student_data and not pd.isna(student_data[factor]):
                percentile = float(student_data[factor])
                
                # Determine risk level based on percentile using instruction set thresholds
                if percentile < 45:  # Changed from 40 to 45
                    risk_level = 'At Risk'
                    risk_areas.append({
                        'factor': factor,
                        'percentile': percentile,
                        'level': risk_level
                    })
                elif percentile >= 65:  # Changed from 70 to 65
                    risk_level = 'Strength'
                    strength_areas.append({
                        'factor': factor,
                        'percentile': percentile,
                        'level': risk_level
                    })
                else:
                    risk_level = 'Balanced'
                
                available_factors[factor] = {
                    'percentile': percentile,
                    'risk_level': risk_level,
                    'description': self.pass_descriptions.get(factor, 'No description available.')
                }
        
        # Use the model to predict overall risk if available
        prediction = {}
        if self.pass_model is not None and len(available_factors) >= 3:
            try:
                # Prepare feature vector
                features = [student_data.get(factor, np.nan) for factor in pass_factors]
                features = [np.nanmedian(features) if pd.isna(x) else x for x in features]
                
                # Get prediction and confidence
                proba = self.pass_model.predict_proba([features])[0]
                classes = self.pass_model.classes_
                pred_idx = np.argmax(proba)
                
                prediction = {
                    'overall_risk': classes[pred_idx],
                    'confidence': round(proba[pred_idx], 2),
                    'probabilities': dict(zip(classes, map(lambda x: round(x, 2), proba)))
                }
            except Exception as e:
                prediction = {
                    'error': f"Prediction failed: {str(e)}"
                }
        
        # Return structured analysis
        return {
            'available': True,
            'factors': available_factors,
            'risk_areas': risk_areas,
            'strength_areas': strength_areas,
            'prediction': prediction
        }
    def _analyze_cat4_data(self, student_data):
        """Analyze CAT4 data for a student according to the instruction set thresholds"""
        # CAT4 domains to analyze
        cat4_domains = ['Verbal_Reasoning', 'Quantitative_Reasoning', 
                        'Nonverbal_Reasoning', 'Spatial_Reasoning']
        
        # Check if we have CAT4 data for this student
        if not any(domain in student_data for domain in cat4_domains):
            return {
                'available': False,
                'message': 'No CAT4 data available for this student.'
            }
        
        # Extract available CAT4 domains
        available_domains = {}
        weakness_areas = []
        strength_areas = []
        
        # Count domains with SAS < 90 for fragile learner identification
        weak_domain_count = 0
        
        for domain in cat4_domains:
            if domain in student_data and not pd.isna(student_data[domain]):
                # Check if the value is a stanine (1-9) or SAS (60-140)
                value = float(student_data[domain])
                
                # Convert to SAS if stanine
                if 1 <= value <= 9:
                    stanine = int(value)
                    sas = self._stanine_to_sas(stanine)
                else:
                    sas = value
                    stanine = self._sas_to_stanine(sas)
                
                # Determine level based on SAS using instruction set thresholds
                if sas < 90:
                    level = 'Weakness'
                    weak_domain_count += 1
                    weakness_areas.append({
                        'domain': domain,
                        'sas': sas,
                        'stanine': stanine,
                        'level': level
                    })
                elif sas > 110:
                    level = 'Strength'
                    strength_areas.append({
                        'domain': domain,
                        'sas': sas,
                        'stanine': stanine,
                        'level': level
                    })
                else:
                    level = 'Balanced'
                
                available_domains[domain] = {
                    'sas': sas,
                    'stanine': stanine,
                    'level': level,
                    'description': self.cat4_descriptions.get(domain, 'No description available.')
                }
        
        # Determine fragile learner status based on instruction set
        is_fragile = weak_domain_count >= 2
        
        # Return structured analysis
        return {
            'available': True,
            'domains': available_domains,
            'weakness_areas': weakness_areas,
            'strength_areas': strength_areas,
            'is_fragile_learner': is_fragile
        }
    def _stanine_to_sas(self, stanine):
        """Convert stanine (1-9) to SAS (60-140)"""
        sas_values = [74, 81, 88, 96, 103, 112, 119, 127, 141]
        index = max(0, min(stanine - 1, 8))
        return sas_values[index]

    def _sas_to_stanine(self, sas):
        """Convert SAS (60-140) to stanine (1-9)"""
        if sas >= 126: return 9
        if sas >= 119: return 8
        if sas >= 112: return 7
        if sas >= 104: return 6
        if sas >= 97: return 5
        if sas >= 89: return 4
        if sas >= 82: return 3
        if sas >= 74: return 2
        return 1

    def _analyze_academic_data(self, student_data):
        """Analyze academic performance data for a student"""
        # Academic subjects to analyze
        subjects = ['English_Marks', 'Math_Marks', 'Science_Marks', 'Humanities_Marks']
        
        # Check if we have academic data for this student
        if not any(subject in student_data for subject in subjects):
            return {
                'available': False,
                'message': 'No academic data available for this student.'
            }
        
        # Extract available subject data
        subject_analysis = {}
        
        for subject in subjects:
            if subject in student_data and not pd.isna(student_data[subject]):
                mark = float(student_data[subject])
                
                # Convert to standardized scale if not already (assuming 1-9 scale)
                stanine = int(mark) if 1 <= mark <= 9 else self._convert_to_stanine(mark)
                
                # Determine level based on stanine using instruction set thresholds
                if stanine <= 3:
                    level = 'Weakness'
                elif stanine >= 7:
                    level = 'Strength'
                else:
                    level = 'Balanced'
                
                # Clean subject name for display
                subject_name = subject.replace('_Marks', '').replace('_', ' ')
                
                subject_analysis[subject_name] = {
                    'mark': mark,
                    'stanine': stanine,
                    'level': level
                }
        
        # Calculate average performance
        marks = [data['stanine'] for data in subject_analysis.values()]
        average_stanine = sum(marks) / len(marks) if marks else None
        
        # Return structured analysis
        return {
            'available': True,
            'subjects': subject_analysis,
            'average_stanine': average_stanine
        }
    
    def _convert_to_stanine(self, mark, min_mark=0, max_mark=100):
        """Convert a mark from any scale to stanine (1-9)"""
        # Normalize to 0-1 scale
        normalized = (mark - min_mark) / (max_mark - min_mark)
        # Convert to stanine (assuming normal distribution)
        # This is a simplified conversion - real stanine conversion uses normal distribution
        stanine = max(1, min(9, round(normalized * 8 + 1)))
        return stanine
    
    def _compare_subject_with_cat4(self, subject_stanine, cat4_stanine):
        """Compare subject performance with CAT4 prediction"""
        # Calculate the difference between actual performance and predicted performance
        diff = subject_stanine - cat4_stanine
        
        if diff <= -2:
            return "Underperforming"
        elif diff >= 2:
            return "Overperforming"
        else:
            return "As Expected"
    
    def _recommend_interventions(self, pass_analysis, cat4_analysis, academic_analysis):
        """Generate recommended interventions based on triangulated data"""
        interventions = []
        
        # PASS-based interventions for emotional/behavioral factors
        if pass_analysis.get('available', False):
            for risk_area in pass_analysis.get('risk_areas', []):
                factor = risk_area['factor']
                level = risk_area['level']
                
                if factor in self.emotional_interventions and level in self.emotional_interventions[factor]:
                    for intervention in self.emotional_interventions[factor][level]:
                        interventions.append({
                            'domain': 'emotional',
                            'factor': factor,
                            'title': intervention['title'],
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
        
        # CAT4-based interventions for cognitive factors
        if cat4_analysis.get('available', False):
            # Fragile learner interventions take priority
            if cat4_analysis.get('is_fragile_learner', False):
                for intervention in self.cognitive_interventions['Fragile_Learner']['Yes']:
                    interventions.append({
                        'domain': 'cognitive',
                        'factor': 'Fragile Learner',
                        'title': intervention['title'],
                        'description': intervention['description'],
                        'priority': intervention['priority']
                    })
            
            # Add specific cognitive domain interventions
            for weakness in cat4_analysis.get('weakness_areas', []):
                domain = weakness['domain']
                level = weakness['level']
                
                if domain in self.cognitive_interventions and level in self.cognitive_interventions[domain]:
                    for intervention in self.cognitive_interventions[domain][level]:
                        interventions.append({
                            'domain': 'cognitive',
                            'factor': domain,
                            'title': intervention['title'],
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
        
        # Academic interventions based on subject performance and CAT4 comparison
        if academic_analysis.get('available', False):
            # Subject weakness interventions
            for subject, data in academic_analysis.get('subjects', {}).items():
                if data['level'] == 'Weakness':
                    for intervention in self.academic_interventions['Weakness']:
                        interventions.append({
                            'domain': 'academic',
                            'factor': f"{subject} Performance",
                            'title': intervention['title'].replace('Subject', subject),
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
            
            # Underperformance relative to cognitive ability
            for subject, comparison in academic_analysis.get('cat4_comparison', {}).items():
                if comparison == 'Underperforming':
                    for intervention in self.academic_interventions['Underperforming']:
                        interventions.append({
                            'domain': 'academic',
                            'factor': f"{subject} Underperformance",
                            'title': intervention['title'].replace('Subject', subject),
                            'description': intervention['description'],
                            'priority': intervention['priority']
                        })
        
        # Sort interventions by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        interventions.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return interventions
    
    def _compute_grade_summary(self, grade_data):
        """Compute summary statistics for a grade level"""
        total_students = len(grade_data)
        
        # PASS risk counts
        pass_factors = ['Self_Regard', 'Attitude_Teachers', 'General_Work_Ethic', 
                        'Emotional_Control', 'Social_Confidence', 'Curriculum_Demand']
        at_risk_counts = {}
        for factor in pass_factors:
            if factor in grade_data.columns:
                at_risk_counts[factor] = sum(grade_data[factor] < 40)
        
        # Count students with at least one at-risk factor
        students_with_risk = sum(any(row[factor] < 40 for factor in pass_factors if factor in row) 
                               for _, row in grade_data.iterrows())
        
        # CAT4 weakness counts
        cat4_domains = ['Verbal_Reasoning', 'Quantitative_Reasoning', 
                        'Nonverbal_Reasoning', 'Spatial_Reasoning']
        weakness_counts = {}
        for domain in cat4_domains:
            if domain in grade_data.columns:
                weakness_counts[domain] = sum(grade_data[domain] <= 3)
        
        # Count fragile learners
        fragile_learners = sum(sum(row[domain] <= 3 for domain in cat4_domains if domain in row) >= 2
                            for _, row in grade_data.iterrows())
        
        # Academic performance summary
        subjects = ['English_Marks', 'Math_Marks', 'Science_Marks', 'Humanities_Marks']
        subject_averages = {}
        for subject in subjects:
            if subject in grade_data.columns:
                subject_averages[subject.replace('_Marks', '')] = grade_data[subject].mean()
        
        return {
            'total_students': total_students,
            'at_risk_factors': at_risk_counts,
            'students_with_risk': students_with_risk,
            'cat4_weaknesses': weakness_counts,
            'fragile_learners': fragile_learners,
            'subject_averages': subject_averages
        }
    
    def generate_student_report(self, student_analysis):
        """Generate a comprehensive PDF report for a student"""
        # Initialize PDF report generator
        report_generator = StudentReportGenerator()
        
        # Generate the report
        report_pdf = report_generator.generate_report(student_analysis)
        
        return report_pdf


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