class Expenses:

    def __init__(self, income):
        self.income = income
        self.bills = {
            "Housing": 0,
            "Electricity": 0,
            "Water": 0,
            "Internet": 0,
            "Phone": 0,
            "Gas": 0,
            "Cable": 0,
            "Car": 0,
            "Insurance": 0,
            "Subscriptions": 0,
            "Credit Cards": 0,
            "Groceries": 0,
            "Dining Out": 0,
            "Entertainment": 0,
            "Savings": 0,
            "Loan Payments": 0,
            "Etc": 0,
            
        }

    def get_bills(self):
        return self.bills

    def create_bills(self):
        print("Please enter dollar amounts for the following categories:\n")
        for key in self.bills:
            valid_input = False
            while not valid_input:
                try:
                    self.bills[key] = float(input(f" {key}: "))
                    valid_input = True
                except ValueError:
                    print("Please enter a valid number for expense.")

    def get_total_expenses(self):
        return sum(self.bills.values())

    def add_bill(self, category, amount):
        """
        Add or update an expense category with a specified amount.
        If the category does not exist, it will be added.
        """
        if amount < 0:
            raise ValueError("Amount cannot be negative.")
        self.bills[category] = amount

