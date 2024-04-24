class Budget:

  # Initializes the budget with provided monthly income
  def __init__(self, income):
    self.income = income

  # Getter for the monthly income
  def get_income(self):
    return f"${self.income}"

  # def deduct_expenses(self, expense):
  #   self.income -= expense
  #   return f"{expense} has been deducted. Remaining balance: {self.income}"
