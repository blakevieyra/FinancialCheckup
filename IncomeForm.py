from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length

class IncomeForm(FlaskForm):
    income = StringField('Income', validators=[DataRequired(), Length(min=1)])
    submit = SubmitField('Update Monthly Income')
