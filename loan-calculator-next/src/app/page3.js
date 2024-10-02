'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ErrorBoundary from '@/components/ErrorBoundary';

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const Home = () => {
  // State variables
  const [loanAmount, setLoanAmount] = useState('20000.00');
  const [annualInterestRate, setAnnualInterestRate] = useState('7.5');
  const [paymentAmount, setPaymentAmount] = useState(''); // Allow payment amount to be optional
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysMethod, setDaysMethod] = useState('Actual');
  const [yearBasis, setYearBasis] = useState('365');
  const [amortTerm, setAmortTerm] = useState('60');
  const [loanTerm, setLoanTerm] = useState('60');
  const [additionalPrincipal, setAdditionalPrincipal] = useState('0');
  const [creditInsurance, setCreditInsurance] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [customPaymentAmount, setCustomPaymentAmount] = useState(false);
  const [useDifferentAmortTerm, setUseDifferentAmortTerm] = useState(false);

  const printRef = useRef(null);

  // Validation function for numeric inputs
  const isValidNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  };

  useEffect(() => {
    if (!useDifferentAmortTerm) {
      setAmortTerm(loanTerm);
    }
  }, [loanTerm, useDifferentAmortTerm]);

  // Debounce mechanism for auto-calculation
  useEffect(() => {
    if (customPaymentAmount) return; // Do not auto-calculate if custom payment amount is used

    const timer = setTimeout(() => {
      handleCalculate();
    }, 500); // Delay of 500ms

    return () => clearTimeout(timer);
  }, [
    loanAmount,
    annualInterestRate,
    loanTerm,
    amortTerm,
    additionalPrincipal,
    paymentFrequency,
    firstDueDate,
    daysMethod,
    yearBasis,
    creditInsurance,
    customPaymentAmount,
    useDifferentAmortTerm,
  ]);

  const generatePDF = async () => {
    if (!result) {
      alert('Please calculate the loan first.');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');

    // Add title
    pdf.setFontSize(20);
    pdf.text('Loan Calculation Summary', 20, 20);

    // Add loan summary
    pdf.setFontSize(12);
    pdf.text(`Loan Amount: ${formatCurrency(parseFloat(loanAmount))}`, 20, 40);
    pdf.text(`Interest Rate: ${annualInterestRate}%`, 20, 50);
    pdf.text(`Loan Term: ${loanTerm} payments`, 20, 60);
    pdf.text(`Payment Amount: ${formatCurrency(result.payment_amount)}`, 20, 70);
    pdf.text(`Total Interest: ${formatCurrency(result.total_interest)}`, 20, 80);
    pdf.text(`Total Payment: ${formatCurrency(result.total_payment)}`, 20, 90);
    if (creditInsurance) {
      pdf.text(`Total Insurance: ${formatCurrency(result.total_insurance)}`, 20, 100);
    }

    // Add charts
    const chartElements = document.querySelectorAll('#loan-charts > div');
    for (let chartElement of chartElements) {
      const canvas = await html2canvas(chartElement);
      const imgData = canvas.toDataURL('image/png');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 20; // 10mm margin on each side

      const imgWidth = maxWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
    }

    // Add amortization schedule
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Amortization Schedule', 20, 20);

    const tableHeaders = ['#', 'Payment Date', 'Payment Amount', 'Principal', 'Interest'];
    if (creditInsurance) {
      tableHeaders.push('Insurance');
    }
    tableHeaders.push('Additional Principal', 'Ending Balance');

    const tableData = result.amortization_schedule.map(payment => {
      const row = [
        payment.payment_number,
        payment.payment_date,
        formatCurrency(payment.payment_amount + payment.additional_principal),
        formatCurrency(payment.principal_paid),
        formatCurrency(payment.interest_paid)
      ];
      if (creditInsurance) {
        row.push(formatCurrency(payment.insurance_paid));
      }
      row.push(formatCurrency(payment.additional_principal), formatCurrency(payment.ending_balance));
      return row;
    });

    pdf.autoTable({
      startY: 30,
      head: [tableHeaders],
      body: tableData,
    });

    pdf.save('Loan_Calculation.pdf');
  };

  const handleSaveAsExcel = async () => {
    try {
      const response = await axios.post('http://localhost:8000/export-excel', result, {
        responseType: 'blob',
      });
      saveAs(new Blob([response.data]), 'Loan_Calculation.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleCalculate = async () => {
    setError(null);
    setProgress(0);

    // Validate inputs
    if (
      !isValidNumber(loanAmount) ||
      !isValidNumber(annualInterestRate) ||
      !isValidNumber(loanTerm) ||
      !isValidNumber(amortTerm) ||
      !isValidNumber(additionalPrincipal)
    ) {
      setError('Please enter valid numeric values for all required fields.');
      return;
    }

    // If payment amount is provided, validate it
    if (customPaymentAmount && paymentAmount !== '' && !isValidNumber(paymentAmount)) {
      setError('Please enter a valid numeric value for Payment Amount.');
      return;
    }

    const data = {
      loan_amount: parseFloat(loanAmount),
      annual_interest_rate: parseFloat(annualInterestRate),
      payment_amount: customPaymentAmount ? (paymentAmount === '' ? null : parseFloat(paymentAmount)) : null,
      payment_frequency: paymentFrequency,
      first_due_date: firstDueDate,
      days_method: daysMethod,
      year_basis: parseInt(yearBasis),
      loan_term: parseInt(loanTerm),
      amort_term: parseInt(amortTerm),
      additional_principal: parseFloat(additionalPrincipal),
      credit_insurance: creditInsurance,
    };

    try {
      setProgress(50);
      console.log('Sending data:', data);
      const response = await axios.post('http://localhost:8000/calculate', data);
      console.log('Received response:', response.data);
      setResult(response.data);

      // Update paymentAmount if customPaymentAmount is false
      if (!customPaymentAmount) {
        setPaymentAmount(response.data.payment_amount.toFixed(2));
      }

      setProgress(100);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to calculate loan. Please check the console for more details.');
      }
      return null;
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    // No need to call handleCalculate() here; the debounce will handle it
  };

  const handleCheckboxChange = (setter) => (value) => {
    setter(value);
  };

  const renderInputField = (label, value, setter, tooltip, type = 'text', options = null, min = null, max = null, step = null, disabled = false) => {
    const handleChange = async (e) => {
      let newValue = e.target.value;

      // Special handling for Additional Principal
      if (label === 'Additional Principal') {
        // Remove any non-digit characters
        newValue = newValue.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = newValue.split('.');
        if (parts.length > 2) {
          newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limit to two decimal places
        if (parts[1] && parts[1].length > 2) {
          newValue = parseFloat(newValue).toFixed(2);
        }
      }

      setter(newValue);

      // For days method and year basis, we need to recalculate and update the payment amount
      if (label === 'Days Method' || label === 'Year Basis') {
        // No need to call handleCalculate() here; the debounce will handle it
      }
    };

    const handleSliderChange = (newValue) => {
      setter(newValue[0].toString());
      // No need to call handleCalculate() here; the debounce will handle it
    };

    const formatSliderValue = (value) => {
      if (label === 'Loan Amount') {
        return `$${Number(value).toLocaleString()}`;
      } else if (label === 'Interest Rate (%)') {
        return `${value}%`;
      } else {
        return value;
      }
    };

    return (
      <div className="w-full">
        <Label htmlFor={label} className="text-center block mb-2">{label}</Label>
        <div className="flex items-center space-x-4">
          {options ? (
            <select
              id={label}
              value={value}
              onChange={(e) => {
                setter(e.target.value);
                // No need to call handleCalculate() here; the debounce will handle it
              }}
              className="text-center bg-secondary/5 border border-secondary/20 focus:border-primary/50 focus:ring-primary/50 w-full p-2 rounded-md"
            >
              {options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <>
              <Input
                type={type}
                id={label}
                value={value}
                onChange={label === 'First Due Date' ? (e) => setter(e.target.value) : handleChange}
                className="text-center bg-secondary/5 border border-secondary/20 focus:border-primary/50 focus:ring-primary/50 w-1/3"
                min={min}
                max={max}
                step={step}
                disabled={disabled}
              />
              {(label === 'Loan Amount' || label === 'Interest Rate (%)' || label === 'Loan Term (Payments)') && (
                <div className="flex-1 flex items-center space-x-2">
                  <Slider
                    value={[parseFloat(value)]}
                    onValueChange={handleSliderChange}
                    max={label === 'Loan Amount' ? 10000000 : label === 'Interest Rate (%)' ? 50 : 480}
                    step={label === 'Loan Amount' ? 500 : label === 'Interest Rate (%)' ? 0.1 : 1}
                    className="flex-1"
                  />
                  <span className="w-24 text-right">{formatSliderValue(value)}</span>
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{tooltip}</p>
      </div>
    );
  };

  const renderLoanSummary = () => (
    <Card>
      <CardHeader>
        <CardTitle>Loan Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Loan Amount</p>
            <p>{formatCurrency(parseFloat(loanAmount))}</p>
          </div>
          <div>
            <p className="font-medium">Payment Amount</p>
            <p>{formatCurrency(parseFloat(paymentAmount))}</p>
          </div>
          <div>
            <p className="font-medium">Total Payment per Period</p>
            <p>{formatCurrency(parseFloat(paymentAmount) + parseFloat(additionalPrincipal))}</p>
          </div>
          {creditInsurance && (
            <>
              <div>
                <p className="font-medium">Payment Amount without Insurance</p>
                <p>{formatCurrency(result.payment_amount_no_insurance)}</p>
              </div>
              <div>
                <p className="font-medium">Payment Increase due to Insurance</p>
                <p>{formatCurrency(result.payment_increase)}</p>
              </div>
              <div>
                <p className="font-medium">Total Insurance Cost</p>
                <p>{formatCurrency(result.total_insurance)}</p>
              </div>
            </>
          )}
          <div>
            <p className="font-medium">Interest Rate (APR)</p>
            <p>{annualInterestRate}%</p>
          </div>
          <div>
            <p className="font-medium">Scheduled Term</p>
            <p>{loanTerm} payments</p>
          </div>
          <div>
            <p className="font-medium">Actual Term</p>
            <p>{result.actual_loan_term} payments</p>
          </div>
          <div>
            <p className="font-medium">Total Payments</p>
            <p>{formatCurrency(result.total_payment)}</p>
          </div>
          <div>
            <p className="font-medium">Total Interest Paid</p>
            <p>{formatCurrency(result.total_interest)}</p>
          </div>
          {result.interest_savings > 0 && (
            <div>
              <p className="font-medium">Interest Saved by Additional Principal</p>
              <p>{formatCurrency(result.interest_savings)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderAmortizationSchedule = () => (
    <Card>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Total Payment</TableHead>
              <TableHead>Principal Paid</TableHead>
              <TableHead>Interest Paid</TableHead>
              {creditInsurance && <TableHead>Insurance Paid</TableHead>}
              <TableHead>Additional Principal</TableHead>
              <TableHead>Ending Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.amortization_schedule.map((payment) => (
              <TableRow key={payment.payment_number}>
                <TableCell>{payment.payment_number}</TableCell>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell>{formatCurrency(payment.payment_amount + payment.additional_principal)}</TableCell>
                <TableCell>{formatCurrency(payment.principal_paid)}</TableCell>
                <TableCell>{formatCurrency(payment.interest_paid)}</TableCell>
                {creditInsurance && <TableCell>{formatCurrency(payment.insurance_paid)}</TableCell>}
                <TableCell>{formatCurrency(payment.additional_principal)}</TableCell>
                <TableCell>{formatCurrency(payment.ending_balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderPaymentBreakdownChart = () => {
    if (!result) return null;

    const paymentData = result.amortization_schedule.map((payment) => ({
      payment: payment.payment_number,
      Principal: payment.principal_paid,
      Interest: payment.interest_paid,
      Insurance: payment.insurance_paid || 0,
    }));

    const balanceData = result.amortization_schedule.map((payment) => ({
      payment: payment.payment_number,
      Balance: payment.ending_balance,
    }));

    return (
      <>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Breakdown Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <div id="loan-charts" className="w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <XAxis
                    dataKey="payment"
                    label={{ value: 'Payment Number', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', offset: 10 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
                    labelFormatter={(label) => `Payment ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Principal" stackId="a" fill="#8884d8" />
                  <Bar dataKey="Interest" stackId="a" fill="#82ca9d" />
                  {creditInsurance && <Bar dataKey="Insurance" stackId="a" fill="#ffc658" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Balance Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <div id="loan-charts" className="w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <XAxis
                    dataKey="payment"
                    label={{ value: 'Payment Number', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft', offset: 10 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
                    labelFormatter={(label) => `Payment ${label}`}
                  />
                  <Bar dataKey="Balance" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4 sm:p-8 md:p-12 flex items-center justify-center"
    >
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="text-center bg-primary/5 py-6">
            <CardTitle className="text-3xl font-bold text-primary">Loan Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="loan-input">
                <AccordionTrigger>Loan Input</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {renderInputField('Loan Amount', loanAmount, setLoanAmount, 'Enter the total amount you wish to borrow', 'number', null, 0, 10000000, 500)}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="customPaymentAmount"
                        checked={customPaymentAmount}
                        onCheckedChange={(checked) => {
                          setCustomPaymentAmount(checked);
                          if (!checked) {
                            setPaymentAmount('');
                            handleCalculate();
                          }
                        }}
                      />
                      <Label htmlFor="customPaymentAmount">Custom Payment Amount</Label>
                    </div>
                    {renderInputField('Payment Amount (Optional)', paymentAmount, setPaymentAmount, 'Enter your desired payment amount or leave blank to calculate it', 'number', null, 0, null, 0.01, !customPaymentAmount)}
                    {renderInputField('Interest Rate (%)', annualInterestRate, setAnnualInterestRate, 'Enter the annual interest rate', 'number', null, 0, 50, 0.1)}
                    {renderInputField('Loan Term (Payments)', loanTerm, setLoanTerm, 'Enter the loan term in number of payments', 'number', null, 1, 480, 1)}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useDifferentAmortTerm"
                        checked={useDifferentAmortTerm}
                        onCheckedChange={(checked) => {
                          setUseDifferentAmortTerm(checked);
                          if (!checked) {
                            setAmortTerm(loanTerm);
                          }
                        }}
                      />
                      <Label htmlFor="useDifferentAmortTerm">
                        Use different amortization term (e.g., for balloon payments)
                      </Label>
                    </div>
                    {useDifferentAmortTerm && renderInputField(
                      'Amortization Term (Payments)',
                      amortTerm,
                      setAmortTerm,
                      'Enter the amortization term in number of payments',
                      'number',
                      null,
                      1,
                      480,
                      1
                    )}
                    {renderInputField('Additional Principal', additionalPrincipal, setAdditionalPrincipal, 'Enter any additional principal payments', 'number')}
                    {renderInputField('Payment Frequency', paymentFrequency, setPaymentFrequency, 'Select payment frequency', 'text', ['Monthly', 'Biweekly', 'Weekly'])}
                    {renderInputField('First Due Date', firstDueDate, setFirstDueDate, 'Select first payment due date', 'date')}
                    {renderInputField('Days Method', daysMethod, (value) => { setDaysMethod(value); }, 'Select days method', 'text', ['Actual', '30 Day Month'])}
                    {renderInputField('Year Basis', yearBasis, (value) => { setYearBasis(value); }, 'Select the year basis for interest calculations', 'text', ['360', '365', '366'])}

                    <div className="flex items-center justify-center space-x-2">
                      <Checkbox id="creditInsurance" checked={creditInsurance} onCheckedChange={handleCheckboxChange(setCreditInsurance)} />
                      <Label htmlFor="creditInsurance">Include Credit Insurance</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-center">
              <Button onClick={handleCalculate} className="w-full max-w-xs bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-3 px-6 rounded-md shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1">
                Calculate
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="text-center">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {progress > 0 && progress < 100 && (
              <Progress value={progress} className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: `${progress}%` }} />
              </Progress>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div ref={printRef}>
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="loan-summary">
                      <AccordionTrigger>Loan Summary</AccordionTrigger>
                      <AccordionContent>
                        {renderLoanSummary()}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment-breakdown">
                      <AccordionTrigger>Payment Breakdown Chart</AccordionTrigger>
                      <AccordionContent>
                        {renderPaymentBreakdownChart()}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="amortization-schedule">
                      <AccordionTrigger>Amortization Schedule</AccordionTrigger>
                      <AccordionContent>
                        {renderAmortizationSchedule()}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <div className="flex justify-center space-x-4">
                  <Button onClick={generatePDF}>Save as PDF</Button>
                  <Button onClick={handleSaveAsExcel}>Save as Excel</Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

const SafeHome = () => (
  <ErrorBoundary>
    <Home />
  </ErrorBoundary>
);

export default SafeHome;
