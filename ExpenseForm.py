from flask_wtf import FlaskForm
from wtforms import StringField, HiddenField
from wtforms.fields import DecimalField
from wtforms.validators import DataRequired, NumberRange

class ExpenseForm(FlaskForm):
    amounts = DecimalField('Amount', validators=[DataRequired(), NumberRange(min=0.01)])
    categories = HiddenField('Category')
