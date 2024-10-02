'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

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
  // Updated state variables to match backend requirements
  const [loanAmount, setLoanAmount] = useState(20000.00);
  const [annualInterestRate, setAnnualInterestRate] = useState(7.5);
  const [paymentAmount, setPaymentAmount] = useState(''); // Allow payment amount to be optional
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysMethod, setDaysMethod] = useState('Actual');
  const [yearBasis, setYearBasis] = useState(365);
  const [amortTerm, setAmortTerm] = useState(60);
  const [loanTerm, setLoanTerm] = useState(60);
  const [additionalPrincipal, setAdditionalPrincipal] = useState(0);
  const [creditInsurance, setCreditInsurance] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const printRef = useRef(null);

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
    pdf.text(`Loan Amount: ${formatCurrency(loanAmount)}`, 20, 40);
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const chartAspectRatio = canvas.width / canvas.height;
      const maxWidth = pageWidth - 20; // 10mm margin on each side
      
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / chartAspectRatio;
      
      // Always start a new page for each chart
      pdf.addPage();
      let yPosition = 20;
      
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
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
        formatCurrency(payment.payment_amount),
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

    const data = {
      loan_amount: parseFloat(loanAmount),
      annual_interest_rate: parseFloat(annualInterestRate),
      payment_amount: paymentAmount === '' ? null : parseFloat(paymentAmount),
      payment_frequency: paymentFrequency,
      first_due_date: firstDueDate,
      days_method: daysMethod,
      year_basis: parseInt(yearBasis),
      amort_term: parseInt(amortTerm),
      loan_term: parseInt(loanTerm),
      additional_principal: parseFloat(additionalPrincipal),
      credit_insurance: creditInsurance,
    };

    try {
      setProgress(50);
      console.log('Sending data:', data);  // Log the data being sent
      const response = await axios.post('http://localhost:8000/calculate', data);
      console.log('Received response:', response.data);  // Log the received data
      setResult(response.data);
      if (response.data.payment_amount) {
        setPaymentAmount(response.data.payment_amount.toFixed(2));
      }
      setProgress(100);
    } catch (error) {
      console.error('API Error:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to calculate loan. Please check the console for more details.');
      }
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
  };

  const handleCheckboxChange = (setter) => (value) => {
    setter(value);
  };

  const renderInputField = (label, value, onChange, min, max, step, tooltip, type = 'text', options = null) => {
    const isCurrencyField = label === 'Loan amount' || label === 'Additional principal';
    const isInterestField = label === 'Interest rate (%)';

    const handleChange = (e) => {
      let newValue = e.target.value.replace(/[^0-9.]/g, '');
      if (newValue.split('.').length > 2) {
        newValue = newValue.replace(/\.+$/, '');
      }
      onChange(newValue);
    };

    const handleBlur = () => {
      let numValue = parseFloat(value);
      if (isNaN(numValue)) {
        numValue = 0;
      }
      if (isCurrencyField || isInterestField) {
        onChange(numValue.toFixed(2));
      } else {
        onChange(numValue);
      }
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full max-w-sm">
              <Label htmlFor={label} className="text-center block">{label}</Label>
              {options ? (
                <select
                  id={label}
                  value={value}
                  onChange={onChange}
                  className="text-center bg-secondary/5 border border-secondary/20 focus:border-primary/50 focus:ring-primary/50 w-full"
                >
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={type}
                  id={label}
                  value={value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min={min}
                  max={max}
                  step={step}
                  className="text-center bg-secondary/5 border border-secondary/20 focus:border-primary/50 focus:ring-primary/50"
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
            <p className="font-medium">Loan amount</p>
            <p>{formatCurrency(loanAmount)}</p>
          </div>
          <div>
            <p className="font-medium">Payment amount</p>
            <p>{formatCurrency(result.payment_amount)}</p>
          </div>
          <div>
            <p className="font-medium">Interest rate (APR)</p>
            <p>{annualInterestRate}%</p>
          </div>
          <div>
            <p className="font-medium">Term</p>
            <p>{loanTerm} payments</p>
          </div>
          <div>
            <p className="font-medium">Total payments</p>
            <p>{formatCurrency(result.total_payment)}</p>
          </div>
          <div>
            <p className="font-medium">Total interest paid</p>
            <p>{formatCurrency(result.total_interest)}</p>
          </div>
          {creditInsurance && (
            <div>
              <p className="font-medium">Total insurance cost</p>
              <p>{formatCurrency(result.total_insurance)}</p>
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
              <TableHead className="text-right">Payment Date</TableHead>
              <TableHead className="text-right">Payment Amount</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              {creditInsurance && <TableHead className="text-right">Insurance</TableHead>}
              <TableHead className="text-right">Additional Principal</TableHead>
              <TableHead className="text-right">Ending Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.amortization_schedule.map((payment, index) => (
              <TableRow 
                key={index}
                className={`${index % 2 === 0 ? 'bg-secondary/5' : ''} hover:bg-primary/5 transition-colors duration-200`}
              >
                <TableCell>{payment.payment_number}</TableCell>
                <TableCell className="text-right">{payment.payment_date}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.payment_amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.principal_paid)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.interest_paid)}</TableCell>
                {creditInsurance && <TableCell className="text-right">{formatCurrency(payment.insurance_paid || 0)}</TableCell>}
                <TableCell className="text-right">{formatCurrency(payment.additional_principal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.ending_balance)}</TableCell>
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
            <div className="w-full h-[450px]">
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
                  <Legend verticalAlign="top" height={36}/>
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
            <div className="w-full h-[450px]">
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
                    {renderInputField('Loan amount', loanAmount, handleInputChange(setLoanAmount), 0, 10000000, 500, 'Enter the total amount you wish to borrow', 'number')}
                    {renderInputField('Payment amount (optional)', paymentAmount, handleInputChange(setPaymentAmount), 0, 100000, 10, 'Enter your desired payment amount or leave blank to calculate it', 'number')}
                    {renderInputField('Interest rate (%)', annualInterestRate, handleInputChange(setAnnualInterestRate), 0, 50, 0.1, 'Enter the annual interest rate', 'number')}
                    {renderInputField('Amortization term (payments)', amortTerm, handleInputChange(setAmortTerm), 1, 480, 1, 'Enter the amortization term in number of payments', 'number')}
                    {renderInputField('Loan term (payments)', loanTerm, handleInputChange(setLoanTerm), 1, 480, 1, 'Enter the loan term in number of payments', 'number')}
                    {renderInputField('Additional principal', additionalPrincipal, handleInputChange(setAdditionalPrincipal), 0, loanAmount / 2, 10, 'Enter any additional principal payments', 'number')}
                    {renderInputField('Payment frequency', paymentFrequency, handleInputChange(setPaymentFrequency), null, null, null, 'Select payment frequency', 'text', ['Monthly', 'Biweekly', 'Weekly'])}
                    {renderInputField('First due date', firstDueDate, handleInputChange(setFirstDueDate), null, null, null, 'Select first payment due date', 'date')}
                    {renderInputField('Days method', daysMethod, handleInputChange(setDaysMethod), null, null, null, 'Select days method', 'text', ['Actual', '30 Day Month'])}
                    {renderInputField('Year basis', yearBasis, handleInputChange(setYearBasis), 1, 366, 1, 'Enter the year basis (360, 365, or 366)', 'number')}

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
                        <div id="loan-charts">
                          {renderPaymentBreakdownChart()}
                        </div>
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

export default Home;
