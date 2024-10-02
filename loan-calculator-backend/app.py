from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from decimal import Decimal, getcontext, ROUND_HALF_UP
from dateutil.relativedelta import relativedelta
import io
from fastapi.responses import StreamingResponse
from typing import Optional
import xlsxwriter

app = FastAPI()

# Set decimal precision higher to ensure accurate calculations
getcontext().prec = 28

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoanRequest(BaseModel):
    loan_amount: float = Field(ge=0, description="Total loan amount")
    annual_interest_rate: float = Field(ge=0, description="Annual interest rate (APR)")
    payment_amount: Optional[float] = Field(default=None, ge=0, description="Payment amount")
    payment_frequency: str = Field(..., description="Payment frequency (e.g., 'Monthly')")
    first_due_date: date = Field(..., description="First payment due date")
    days_method: str = Field(..., description="'Actual' or '30 Day Month'")
    year_basis: int = Field(ge=1, description="Year basis (e.g., 365 or 360)")
    loan_term: int = Field(ge=1, description="Loan term in payments")
    amort_term: Optional[int] = Field(None, ge=1, description="Amortization term in payments (optional)")
    additional_principal: float = Field(default=0.0, ge=0, description="Additional principal payment per period")
    credit_insurance: bool = Field(default=False, description="Include credit insurance")

from decimal import Decimal, getcontext, ROUND_HALF_DOWN, ROUND_HALF_UP
from dateutil.relativedelta import relativedelta

# Set decimal precision higher to ensure accurate calculations
getcontext().prec = 28

class LoanCalculator:
    def __init__(self, principal, interest_rate, payment_amount, payment_frequency, first_due_date, 
                 days_method, year_basis, loan_term, amort_term=None, additional_principal=0.0, credit_insurance=False):
        self.principal = Decimal(str(principal))
        self.interest_rate = Decimal(str(interest_rate)) / Decimal('100')  # Convert to decimal fraction
        self.payment_amount = Decimal(str(payment_amount)) if payment_amount is not None else None
        self.payment_frequency = payment_frequency
        self.first_due_date = first_due_date
        self.days_method = days_method
        self.year_basis = int(year_basis)
        self.loan_term = loan_term
        self.amort_term = amort_term if amort_term is not None else loan_term
        self.additional_principal = Decimal(str(additional_principal))
        self.credit_insurance = credit_insurance

        # Calculate payment amount if not provided
        if self.payment_amount is None:
            self.payment_amount = self.calculate_payment_amount()

    def calculate_insurance_premium(self, balance):
        # Calculate the insurance premium as $0.15 per $100 of the remaining balance
        insurance_premium = (balance / Decimal('100')) * Decimal('0.15')
        max_insurance = Decimal('45.00')
        return min(insurance_premium.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP), max_insurance)

    def calculate_payment_amount(self):
        # Initial payment amount without insurance
        if self.days_method == '30 Day Month' and self.year_basis == 360:
            payment_without_insurance = self.calculate_loan_payment_30_360()
        else:
            payment_without_insurance = self.calculate_loan_payment_actual()

        # Use ROUND_HALF_DOWN to match your job's calculator
        payment_without_insurance = payment_without_insurance.quantize(Decimal('0.01'), rounding=ROUND_HALF_DOWN)
        payment = payment_without_insurance

        if self.credit_insurance:
            # Iteratively adjust payment amount to include insurance premiums
            max_iterations = 100
            tolerance = Decimal('0.01')
            for _ in range(max_iterations):
                previous_payment = payment
                # Estimate average insurance premium based on current payment
                average_insurance_premium = self.calculate_average_insurance_premium(payment)
                # Adjust payment amount
                payment = (payment_without_insurance + average_insurance_premium).quantize(Decimal('0.01'), rounding=ROUND_HALF_DOWN)
                # Check for convergence
                if abs(payment - previous_payment) < tolerance:
                    break
            else:
                raise Exception("Failed to converge on payment amount with insurance")
        else:
            payment = payment_without_insurance

        return payment

    def calculate_average_insurance_premium(self, payment_amount):
        # Ensure payment_amount is Decimal
        payment_amount = Decimal(payment_amount)
        # Estimate average insurance premium over the loan term
        total_insurance = Decimal('0.00')
        balance = self.principal
        periods = self.amort_term

        for _ in range(periods):
            insurance_premium = self.calculate_insurance_premium(balance)
            total_insurance += insurance_premium
            # Estimate principal reduction (approximate)
            interest = balance * self.interest_rate / self.get_periods_per_year()
            principal_paid = payment_amount - insurance_premium - interest
            balance -= principal_paid
            if balance <= Decimal('0.00'):
                break

        average_insurance_premium = total_insurance / Decimal(str(periods))
        return average_insurance_premium.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_loan_payment_30_360(self):
        periods_per_year = self.get_periods_per_year()
        rate_per_period = self.interest_rate / Decimal('12')  # Monthly rate
        n = self.amort_term

        # Calculate payment amount using the standard formula
        payment = (self.principal * rate_per_period * (1 + rate_per_period) ** n) / ((1 + rate_per_period) ** n - 1)

        # Adjust for additional principal
        payment += self.additional_principal

        return payment

    def calculate_loan_payment_actual(self):
        periods_per_year = self.get_periods_per_year()
        n = self.amort_term
        rate_per_period = self.interest_rate / periods_per_year

        # Calculate payment amount using the standard formula
        payment = (self.principal * rate_per_period * (1 + rate_per_period) ** n) / ((1 + rate_per_period) ** n - 1)

        # Adjust for additional principal
        payment += self.additional_principal

        return payment

    def calculate(self):
        schedule = []
        balance = self.principal
        payment_number = 1
        current_date = self.first_due_date
        total_interest = Decimal('0')
        total_insurance = Decimal('0')
        total_additional_principal = Decimal('0')

        periods_per_year = self.get_periods_per_year()

        while balance > 0:
            next_date = self.get_next_payment_date(current_date)
            days_in_period = self.calculate_days_in_period(current_date, next_date)

            # Calculate interest based on the selected method
            if self.days_method == '30 Day Month' and self.year_basis == 360:
                interest_paid = balance * (self.interest_rate / Decimal('12'))
            else:
                daily_rate = self.interest_rate / Decimal(str(self.year_basis))
                interest_paid = balance * daily_rate * Decimal(str(days_in_period))

            # Calculate insurance premium
            if self.credit_insurance:
                insurance_paid = self.calculate_insurance_premium(balance)
            else:
                insurance_paid = Decimal('0.00')

            # Calculate principal paid
            principal_paid = self.payment_amount - interest_paid - insurance_paid

            if principal_paid + self.additional_principal > balance:
                # Adjust the final payment to avoid negative balance
                principal_paid = balance - self.additional_principal

            principal_paid = max(principal_paid, Decimal('0.00'))

            # Apply additional principal
            actual_additional_principal = min(self.additional_principal, balance - principal_paid)

            # Update balance
            ending_balance = balance - principal_paid - actual_additional_principal

            total_interest += interest_paid
            total_insurance += insurance_paid
            total_additional_principal += actual_additional_principal

            # Record the payment details
            schedule.append({
                'payment_number': payment_number,
                'payment_date': current_date.strftime('%Y-%m-%d'),
                'start_balance': float(round(balance, 2)),
                'payment_amount': float(round(self.payment_amount, 2)),
                'interest_paid': float(round(interest_paid, 2)),
                'principal_paid': float(round(principal_paid, 2)),
                'additional_principal': float(round(actual_additional_principal, 2)),
                'insurance_paid': float(round(insurance_paid, 2)),
                'ending_balance': float(round(ending_balance, 2))
            })

            # Update balance and payment number
            balance = ending_balance
            payment_number += 1
            current_date = next_date

            if balance <= Decimal('0.00'):
                balance = Decimal('0.00')
                break

        # Payment amount without insurance (for comparison)
        payment_amount_no_insurance = self.payment_amount
        if self.credit_insurance:
            average_insurance_premium = self.calculate_average_insurance_premium(self.payment_amount)
            payment_amount_no_insurance -= average_insurance_premium

        return schedule, total_interest, total_insurance, total_additional_principal, payment_amount_no_insurance

    def get_periods_per_year(self):
        periods_per_year_map = {
            'Monthly': Decimal('12'), 'Annually': Decimal('1'), 'Bi-Weekly': Decimal('26'),
            'Biweekly': Decimal('26'), 'Weekly': Decimal('52'), 'Daily': Decimal('365'),
            'Quarterly': Decimal('4'), 'Semiannually': Decimal('2'), 'Semimonthly': Decimal('24'),
            'Semimonthly 15th and EOM': Decimal('24'), 'Semimonthly 1st and 15th': Decimal('24'),
            # Add more frequencies as needed
        }

        if self.payment_frequency not in periods_per_year_map:
            raise ValueError(f"Unsupported payment frequency: {self.payment_frequency}")

        return periods_per_year_map[self.payment_frequency]

    def get_next_payment_date(self, current_date):
        frequency_map = {
            'Monthly': relativedelta(months=1),
            'Annually': relativedelta(years=1),
            'Bi-Weekly': relativedelta(weeks=2),
            'Biweekly': relativedelta(weeks=2),
            'Daily': relativedelta(days=1),
            'Quarterly': relativedelta(months=3),
            'Semiannually': relativedelta(months=6),
            'Semimonthly': relativedelta(days=15),
            'Semimonthly 15th and EOM': relativedelta(days=15),
            'Semimonthly 1st and 15th': relativedelta(days=15),
            'Weekly': relativedelta(weeks=1),
            # Add more frequencies as needed
        }

        if self.payment_frequency not in frequency_map:
            raise ValueError(f"Unsupported payment frequency: {self.payment_frequency}")

        next_date = current_date + frequency_map[self.payment_frequency]

        # Special handling for "Semimonthly 15th and EOM" and "Semimonthly 1st and 15th"
        if self.payment_frequency in ['Semimonthly 15th and EOM', 'Semimonthly 1st and 15th']:
            if current_date.day < 15:
                next_date = current_date.replace(day=15)
            else:
                next_date = current_date + relativedelta(months=1)
                next_date = next_date.replace(day=1)

        return next_date

    def calculate_days_in_period(self, start_date, end_date):
        if self.days_method == 'Actual':
            return (end_date - start_date).days
        elif self.days_method == '30 Day Month':
            return 30
        else:
            raise ValueError("Unsupported days method")

    def get_amortization_schedule(self):
        schedule, total_interest, total_insurance, total_additional_principal, payment_amount_no_insurance = self.calculate()
        total_payments = len(schedule)
        total_payment_amount = sum(
            Decimal(str(payment['payment_amount'])) + Decimal(str(payment['additional_principal']))
            for payment in schedule
        )
        return {
            'schedule': schedule,
            'total_interest': float(round(total_interest, 2)),
            'total_insurance': float(round(total_insurance, 2)),
            'total_additional_principal': float(round(total_additional_principal, 2)),
            'total_payments': total_payments,
            'total_payment': float(round(total_payment_amount, 2)),
            'insurance_premium_per_payment': None,  # Insurance premium varies each period
            'actual_loan_term': total_payments,
            'payment_amount_no_insurance': float(round(payment_amount_no_insurance, 2)),
        }


@app.post("/calculate-loan-amortization")
def calculate_loan_amortization(request: LoanRequest):
    try:
        # Set amort_term equal to loan_term if not provided
        amort_term = request.amort_term if request.amort_term is not None else request.loan_term

        # Create LoanCalculator instance
        calculator = LoanCalculator(
            principal=request.loan_amount,
            interest_rate=request.annual_interest_rate,  # Interest rate as percentage
            payment_amount=request.payment_amount,
            payment_frequency=request.payment_frequency,
            first_due_date=request.first_due_date,
            days_method=request.days_method,
            year_basis=request.year_basis,
            loan_term=request.loan_term,
            amort_term=amort_term,
            additional_principal=request.additional_principal,
            credit_insurance=request.credit_insurance
        )

        amortization_data = calculator.get_amortization_schedule()

        # Calculate interest savings if additional principal is paid
        if request.additional_principal > 0:
            # Recalculate without additional principal
            calculator_no_additional = LoanCalculator(
                principal=request.loan_amount,
                interest_rate=request.annual_interest_rate,
                payment_amount=request.payment_amount,
                payment_frequency=request.payment_frequency,
                first_due_date=request.first_due_date,
                days_method=request.days_method,
                year_basis=request.year_basis,
                loan_term=request.loan_term,
                amort_term=amort_term,
                additional_principal=0.0,
                credit_insurance=request.credit_insurance
            )
            amortization_data_no_additional = calculator_no_additional.get_amortization_schedule()
            total_interest_no_additional = amortization_data_no_additional['total_interest']
            interest_savings = total_interest_no_additional - amortization_data['total_interest']
        else:
            interest_savings = 0.0

        # Prepare response
        schedule = [
            {
                "payment_number": payment['payment_number'],
                "payment_date": payment['payment_date'],
                "payment_amount": payment['payment_amount'],
                "principal_paid": payment['principal_paid'],
                "interest_paid": payment['interest_paid'],
                "additional_principal": payment['additional_principal'],
                "insurance_paid": payment['insurance_paid'],
                "ending_balance": payment['ending_balance']
            }
            for payment in amortization_data['schedule']
        ]

        # Calculate payment increase due to insurance
        if request.credit_insurance:
            payment_increase = float(calculator.payment_amount) - amortization_data['payment_amount_no_insurance']
        else:
            payment_increase = 0.0

        return {
            "payment_amount": float(calculator.payment_amount),
            "payment_amount_no_insurance": amortization_data['payment_amount_no_insurance'],
            "payment_increase": float(round(payment_increase, 2)),
            "insurance_premium_per_payment": None,  # Varies each period
            "total_interest": amortization_data['total_interest'],
            "total_insurance": amortization_data['total_insurance'],
            "total_additional_principal": amortization_data['total_additional_principal'],
            "total_payment": amortization_data['total_payment'],
            "actual_loan_term": amortization_data['actual_loan_term'],
            "interest_savings": float(round(interest_savings, 2)),
            "amortization_schedule": schedule
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# For backward compatibility, include the existing /calculate endpoint
@app.post("/calculate")
def calculate_loan(request: LoanRequest):
    return calculate_loan_amortization(request)


@app.post("/export-excel")
async def export_excel(data: dict):
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # Add headers
    headers = ["Payment Number", "Payment Date", "Payment Amount", "Principal Paid", "Interest Paid", "Additional Principal", "Insurance Paid", "Ending Balance"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)

    # Write data
    for row, payment in enumerate(data['amortization_schedule'], start=1):
        worksheet.write(row, 0, payment['payment_number'])
        worksheet.write(row, 1, payment['payment_date'])
        worksheet.write(row, 2, payment['payment_amount'])
        worksheet.write(row, 3, payment['principal_paid'])
        worksheet.write(row, 4, payment['interest_paid'])
        worksheet.write(row, 5, payment['additional_principal'])
        worksheet.write(row, 6, payment['insurance_paid'])
        worksheet.write(row, 7, payment['ending_balance'])

    # Add summary
    summary_row = len(data['amortization_schedule']) + 2
    worksheet.write(summary_row, 0, "Summary")
    worksheet.write(summary_row + 1, 0, "Payment Amount")
    worksheet.write(summary_row + 1, 1, data['payment_amount'])
    worksheet.write(summary_row + 2, 0, "Payment Amount without Insurance")
    worksheet.write(summary_row + 2, 1, data['payment_amount_no_insurance'])
    worksheet.write(summary_row + 3, 0, "Total Interest")
    worksheet.write(summary_row + 3, 1, data['total_interest'])
    worksheet.write(summary_row + 4, 0, "Total Insurance")
    worksheet.write(summary_row + 4, 1, data['total_insurance'])
    worksheet.write(summary_row + 5, 0, "Total Additional Principal")
    worksheet.write(summary_row + 5, 1, data['total_additional_principal'])
    worksheet.write(summary_row + 6, 0, "Total Payment")
    worksheet.write(summary_row + 6, 1, data['total_payment'])
    worksheet.write(summary_row + 7, 0, "Interest Savings")
    worksheet.write(summary_row + 7, 1, data['interest_savings'])

    workbook.close()
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Loan_Calculation.xlsx"}
    )
