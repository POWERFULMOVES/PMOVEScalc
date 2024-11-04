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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getEndpointUrl } from '@/config/api';
// import { InformationCircleIcon } from '@heroicons/react/solid';
// Optional: Uncomment the next line if you decide to use seedrandom for reproducibility
// import seedrandom from 'seedrandom';

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

  // State variables for adjustable-rate loans
  const [isAdjustableRate, setIsAdjustableRate] = useState(false);
  const [initialIndexRate, setInitialIndexRate] = useState('');
  const [margin, setMargin] = useState('');
  const [maxRateChange, setMaxRateChange] = useState('');
  const [maxInterestRate, setMaxInterestRate] = useState('');
  const [adjustPayment, setAdjustPayment] = useState(true);
  const [fixedRatePeriod, setFixedRatePeriod] = useState('');
  const [adjustmentFrequency, setAdjustmentFrequency] = useState('');

  // State variables for rate adjustment patterns
  const [useRateAdjustmentPattern, setUseRateAdjustmentPattern] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('Percentage'); // 'Percentage' or 'Fixed Amount'
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [adjustmentPatternFrequency, setAdjustmentPatternFrequency] = useState('1'); // Every X periods
  const [adjustmentDuration, setAdjustmentDuration] = useState(''); // Number of adjustments
  const [rateAdjustments, setRateAdjustments] = useState([]);

  // State variables for random rate adjustments
  const [useRandomAdjustments, setUseRandomAdjustments] = useState(false);
  const [numberOfRandomAdjustments, setNumberOfRandomAdjustments] = useState('');
  const [maxRandomAdjustmentValue, setMaxRandomAdjustmentValue] = useState('');
  const [randomAdjustmentFrequency, setRandomAdjustmentFrequency] = useState('1');
  const [randomSeed, setRandomSeed] = useState('');

  // Add State Variable
  const [initialInterestRate, setInitialInterestRate] = useState('');
  const [minimumInterestRate, setMinimumInterestRate] = useState('0');

  const printRef = useRef(null);

  // Validation function for numeric inputs
  const isValidNumber = (value) => {
    return value !== '' && !isNaN(parseFloat(value)) && isFinite(value);
  };

  useEffect(() => {
    if (!useDifferentAmortTerm) {
      setAmortTerm(loanTerm);
    }
  }, [loanTerm, useDifferentAmortTerm]);

  // Debounce mechanism for auto-calculation
  useEffect(() => {
    if (!customPaymentAmount) return; // Do not auto-calculate if custom payment amount is used

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
    isAdjustableRate,
    initialInterestRate,
    margin,
    maxRateChange,
    maxInterestRate,
    adjustPayment,
    fixedRatePeriod,
    adjustmentFrequency,
    useRateAdjustmentPattern,
    adjustmentType,
    adjustmentValue,
    adjustmentPatternFrequency,
    adjustmentDuration,
    rateAdjustments,
    useRandomAdjustments,
    numberOfRandomAdjustments,
    maxRandomAdjustmentValue,
    randomAdjustmentFrequency,
    randomSeed,
  ]);

  const generatePDF = async () => {
    // Existing code for generating PDF
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
    if (isAdjustableRate) {
      tableHeaders.push('Interest Rate (%)');
    }

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
      if (isAdjustableRate) {
        row.push(payment.interest_rate.toFixed(2));
      }
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
      const response = await axios.post(getEndpointUrl('/export-excel'), result, {
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
      (!isAdjustableRate && !isValidNumber(annualInterestRate)) ||
      (isAdjustableRate && !isValidNumber(initialInterestRate))
    ) {
      setError('Please enter valid numeric values for all required fields.');
      return;
    }

    // If payment amount is provided, validate it
    if (customPaymentAmount && paymentAmount !== '' && !isValidNumber(paymentAmount)) {
      setError('Please enter a valid numeric value for Payment Amount.');
      return;
    }

    // Generate rate adjustments based on pattern if enabled
    let rateAdjustmentsData = null;
    if (isAdjustableRate) {
      if (useRandomAdjustments) {
        rateAdjustmentsData = generateRandomRateAdjustments();
      } else if (useRateAdjustmentPattern) {
        rateAdjustmentsData = generateRateAdjustmentsPattern();
      } else if (rateAdjustments.length > 0) {
        rateAdjustmentsData = rateAdjustments.map((adjustment) => ({
          effective_date: adjustment.effectiveDate,
          index_rate: parseFloat(adjustment.indexRate),
        }));
      } else {
        // Provide an empty array if no rate adjustments are specified
        rateAdjustmentsData = [];
      }
    }

    const data = {
      loan_amount: parseFloat(loanAmount),
      annual_interest_rate: isAdjustableRate ? null : parseFloat(annualInterestRate),
      initial_interest_rate: isAdjustableRate ? parseFloat(initialInterestRate) : null,
      margin: isAdjustableRate ? parseFloat(margin) : 0.0,
      payment_amount: customPaymentAmount ? (paymentAmount === '' ? null : parseFloat(paymentAmount)) : null,
      payment_frequency: paymentFrequency,
      first_due_date: firstDueDate,
      days_method: daysMethod,
      year_basis: parseInt(yearBasis),
      loan_term: parseInt(loanTerm),
      amort_term: parseInt(amortTerm),
      additional_principal: parseFloat(additionalPrincipal),
      credit_insurance: creditInsurance,
      // Adjustable-rate loan fields
      rate_adjustments: rateAdjustmentsData,
      max_rate_change: isAdjustableRate && maxRateChange !== '' ? parseFloat(maxRateChange) : null,
      max_interest_rate: isAdjustableRate && maxInterestRate !== '' ? parseFloat(maxInterestRate) : null,
      adjust_payment: isAdjustableRate ? adjustPayment : true,
      fixed_rate_period: isAdjustableRate && fixedRatePeriod !== '' ? parseInt(fixedRatePeriod) : null,
      adjustment_frequency: isAdjustableRate && adjustmentFrequency !== '' ? parseInt(adjustmentFrequency) : null,
      minimum_interest_rate: isAdjustableRate ? parseFloat(minimumInterestRate) : null,
    };

    try {
      setProgress(50);
      console.log('Sending data:', data);
      const response = await axios.post(getEndpointUrl('/calculate'), data);
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
      let errorMessage = 'Failed to calculate loan. Please check the console for more details.';
      if (error.response && error.response.data && error.response.data.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err) => err.msg).join('; ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = error.response.data.detail.msg || JSON.stringify(error.response.data.detail);
        }
      }
      setError(errorMessage);
      return null;
    }
  };

  const generateRateAdjustmentsPattern = () => {
    const adjustments = [];
    let currentIndexRate = parseFloat(initialIndexRate);
    const totalAdjustments = parseInt(adjustmentDuration);
    const frequency = parseInt(adjustmentPatternFrequency);
    const periodIncrements = frequency;
    const minInterestRate = parseFloat(minimumInterestRate) || 0; // Use user-defined minimum

    let effectiveDate = new Date(firstDueDate);

    for (let i = 1; i <= totalAdjustments; i++) {
      // Increment effective date by the frequency
      effectiveDate.setMonth(effectiveDate.getMonth() + periodIncrements);

      // Calculate new index rate
      if (adjustmentType === 'Fixed Amount') {
        currentIndexRate += parseFloat(adjustmentValue);
      } else if (adjustmentType === 'Percentage') {
        currentIndexRate += (currentIndexRate * parseFloat(adjustmentValue)) / 100;
      }

      // Ensure index rate is not below the minimum interest rate
      if (currentIndexRate < minInterestRate) {
        currentIndexRate = minInterestRate;
      }

      adjustments.push({
        effective_date: effectiveDate.toISOString().split('T')[0],
        index_rate: currentIndexRate.toFixed(6), // Use high precision
      });
    }

    return adjustments;
  };

  const generateRandomRateAdjustments = () => {
    const adjustments = [];
    let currentIndexRate = parseFloat(initialIndexRate);
    const totalAdjustments = parseInt(numberOfRandomAdjustments);
    const frequency = parseInt(randomAdjustmentFrequency);
    const maxAdjustment = parseFloat(maxRandomAdjustmentValue);
    const loanTermPayments = parseInt(loanTerm);
    const adjustmentIntervals = [];
    const minimumInterestRate = 0; // Set your minimum interest rate here

    // Optional: Set random seed for reproducibility
    if (randomSeed !== '') {
      // Simple seed implementation using Math.seedrandom (you need to include the seedrandom library)
      // Uncomment the following lines if you have installed seedrandom
      // seedrandom(randomSeed, { global: true });
    }

    // Generate unique random payment numbers for adjustments
    while (adjustmentIntervals.length < totalAdjustments) {
      const adjustmentPoint = Math.floor(Math.random() * loanTermPayments) + 1;
      if (!adjustmentIntervals.includes(adjustmentPoint)) {
        adjustmentIntervals.push(adjustmentPoint);
      }
    }

    adjustmentIntervals.sort((a, b) => a - b);

    let effectiveDate = new Date(firstDueDate);

    for (let i = 1; i <= loanTermPayments; i++) {
      // Increment effective date by payment frequency
      if (i > 1) {
        effectiveDate.setMonth(effectiveDate.getMonth() + frequency);
      }

      if (adjustmentIntervals.includes(i)) {
        // Randomly decide increase or decrease
        const adjustmentDirection = Math.random() < 0.5 ? -1 : 1;
        // Random adjustment value within maxAdjustment
        const adjustmentValue = Math.random() * maxAdjustment * adjustmentDirection;

        // Apply the adjustment
        currentIndexRate += adjustmentValue;
        // Ensure the interest rate doesn't go below the minimum
        currentIndexRate = Math.max(currentIndexRate, minimumInterestRate);

        adjustments.push({
          effective_date: effectiveDate.toISOString().split('T')[0],
          index_rate: currentIndexRate.toFixed(6),
        });
      }
    }

    return adjustments;
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
  };

  const handleCheckboxChange = (setter) => (value) => {
    setter(value);
  };

  const renderInputField = (
    label,
    value,
    setter,
    tooltip,
    type = 'text',
    options = null,
    min = null,
    max = null,
    step = null,
    disabled = false
  ) => {
    const handleChange = async (e) => {
      let newValue = e.target.value;

      // Special handling for numeric fields
      if (['Additional Principal', 'Adjustment Value', 'Max Adjustment Value (%)'].includes(label)) {
        // Remove any non-digit characters except minus sign and decimal point
        newValue = newValue.replace(/[^\d.-]/g, '');
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
    };

    const handleSliderChange = (newValue) => {
      setter(newValue[0].toString());
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Label htmlFor={label} className="text-center block mb-2">
                  {label}
                </Label>
                {tooltip && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-gray-500 cursor-pointer"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </TooltipTrigger>
            {tooltip && (
              <TooltipContent side="right" align="center">
                <p>{tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center space-x-4">
          {options ? (
            <select
              id={label}
              value={value}
              onChange={(e) => {
                setter(e.target.value);
              }}
              className="input-field text-center w-full p-2 rounded-md"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <>
              <Input
                type={type}
                id={label}
                value={value}
                onChange={label === 'First Due Date' ? (e) => setter(e.target.value) : handleChange}
                className="input-field text-center w-1/3"
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
            <p>{formatCurrency(parseFloat(result.payment_amount))}</p> {/* Regular payment amount */}
          </div>
          <div>
            <p className="font-medium">Additional Principal</p>
            <p>{formatCurrency(parseFloat(result.additional_principal))}</p> {/* Additional principal */}
          </div>
          <div>
            <p className="font-medium">Total Payment per Period</p>
            <p>{formatCurrency(parseFloat(result.payment_amount) + parseFloat(result.additional_principal))}</p> {/* Total payment */}
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
          {!isAdjustableRate && (
            <div>
              <p className="font-medium">Interest Rate (APR)</p>
              <p>{annualInterestRate}%</p>
            </div>
          )}
          {isAdjustableRate && (
            <div>
              <p className="font-medium">Initial Interest Rate</p>
              <p>{(parseFloat(initialIndexRate) + parseFloat(margin)).toFixed(2)}%</p>
            </div>
          )}
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
              {isAdjustableRate && <TableHead>Interest Rate (%)</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.amortization_schedule.map((payment) => (
              <TableRow key={payment.payment_number}>
                <TableCell>{payment.payment_number}</TableCell>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell>{formatCurrency(payment.payment_amount)}</TableCell>
                <TableCell>{formatCurrency(payment.principal_paid)}</TableCell>
                <TableCell>{formatCurrency(payment.interest_paid)}</TableCell>
                {creditInsurance && <TableCell>{formatCurrency(payment.insurance_paid)}</TableCell>}
                <TableCell>{formatCurrency(payment.additional_principal)}</TableCell>
                <TableCell>{formatCurrency(payment.ending_balance)}</TableCell>
                {isAdjustableRate && <TableCell>{payment.interest_rate.toFixed(2)}%</TableCell>}
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

  const renderAdjustableRateFields = () => (
    <div className="space-y-6">
      {/* Checkbox for Adjustable Rate Loan */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAdjustableRate"
          checked={isAdjustableRate}
          onCheckedChange={(checked) => {
            setIsAdjustableRate(checked);
            // Reset fields when toggling
            if (!checked) {
              setInitialInterestRate('');
              setInitialIndexRate('');
              setMargin('');
              setMaxRateChange('');
              setMaxInterestRate('');
              setAdjustPayment(true);
              setFixedRatePeriod('');
              setAdjustmentFrequency('');
              setRateAdjustments([]);
              setUseRateAdjustmentPattern(false);
              setUseRandomAdjustments(false);
            }
          }}
        />
        <Label htmlFor="isAdjustableRate">Adjustable Rate Loan</Label>
      </div>
      {isAdjustableRate && (
        <>
          {renderInputField(
            'Initial Interest Rate (%)',
            initialInterestRate,
            setInitialInterestRate,
            'Enter the initial interest rate for the loan (e.g., 3.5)',
            'number',
            null,
            0,
            50,
            0.1
          )}
          {renderInputField(
            'Initial Index Rate (%)',
            initialIndexRate,
            setInitialIndexRate,
            'Enter the initial index rate used for future adjustments (e.g., 2.5)',
            'number',
            null,
            0,
            100,
            0.1
          )}
          {renderInputField(
            'Minimum Interest Rate (%)',
            minimumInterestRate,
            setMinimumInterestRate,
            'Enter the minimum interest rate for the loan (e.g., 0.5)',
            'number',
            null,
            0,
            50,
            0.1
          )}
          {renderInputField(
            'Margin (%)',
            margin,
            setMargin,
            'Enter the margin added to the index rate for future adjustments (e.g., 1.5)',
            'number',
            null,
            0,
            10,
            0.1
          )}
          {renderInputField(
            'Max Rate Change (%)',
            maxRateChange,
            setMaxRateChange,
            'Enter the maximum rate change per adjustment period (e.g., 2.0)',
            'number',
            null,
            0,
            10,
            0.1
          )}
          {renderInputField(
            'Max Interest Rate (%)',
            maxInterestRate,
            setMaxInterestRate,
            'Enter the maximum interest rate over the life of the loan (e.g., 10.0)',
            'number',
            null,
            0,
            50,
            0.1
          )}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="adjustPayment"
              checked={adjustPayment}
              onCheckedChange={handleCheckboxChange(setAdjustPayment)}
            />
            <Label htmlFor="adjustPayment">Adjust Payment Amount When Interest Rate Changes</Label>
          </div>
          {renderInputField(
            'Fixed Rate Period (Payments)',
            fixedRatePeriod,
            setFixedRatePeriod,
            'Enter the number of payments with a fixed interest rate before adjustments begin (e.g., 12)',
            'number',
            null,
            0,
            480,
            1
          )}
          {renderInputField(
            'Adjustment Frequency (Payments)',
            adjustmentFrequency,
            setAdjustmentFrequency,
            'Enter the number of payments between interest rate adjustments (e.g., 12)',
            'number',
            null,
            1,
            480,
            1
          )}

          {/* Rate Adjustment Pattern Section */}
          <div className="space-y-4">
            {/* Random Adjustments Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useRandomAdjustments"
                checked={useRandomAdjustments}
                onCheckedChange={(checked) => {
                  setUseRandomAdjustments(checked);
                  if (checked) {
                    setUseRateAdjustmentPattern(false);
                    setRateAdjustments([]);
                  }
                }}
              />
              <Label htmlFor="useRandomAdjustments">Use Random Rate Adjustments</Label>
            </div>

            {useRandomAdjustments && (
              <>
                {renderInputField(
                  'Number of Adjustments',
                  numberOfRandomAdjustments,
                  setNumberOfRandomAdjustments,
                  'Enter the total number of rate adjustments to occur randomly over the loan term',
                  'number',
                  null,
                  1,
                  parseInt(loanTerm),
                  1
                )}
                {renderInputField(
                  'Max Adjustment Value (%)',
                  maxRandomAdjustmentValue,
                  setMaxRandomAdjustmentValue,
                  'Enter the maximum percentage change per adjustment (e.g., 0.5 for up to ±0.5%)',
                  'number',
                  null,
                  0.01,
                  100,
                  0.01
                )}
                {renderInputField(
                  'Adjustment Frequency (Payments)',
                  randomAdjustmentFrequency,
                  setRandomAdjustmentFrequency,
                  'Enter the minimum number of payments between possible adjustments',
                  'number',
                  null,
                  1,
                  parseInt(loanTerm),
                  1
                )}
                {renderInputField(
                  'Random Seed (Optional)',
                  randomSeed,
                  setRandomSeed,
                  'Enter a seed number to reproduce the same random adjustments (optional)',
                  'text'
                )}
              </>
            )}

            {/* Existing Rate Adjustment Pattern Option */}
            {!useRandomAdjustments && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useRateAdjustmentPattern"
                    checked={useRateAdjustmentPattern}
                    onCheckedChange={(checked) => {
                      setUseRateAdjustmentPattern(checked);
                      if (checked) {
                        setRateAdjustments([]);
                      }
                    }}
                  />
                  <Label htmlFor="useRateAdjustmentPattern">Use Rate Adjustment Pattern</Label>
                </div>

                {useRateAdjustmentPattern && (
                  <>
                    {renderInputField(
                      'Adjustment Type',
                      adjustmentType,
                      setAdjustmentType,
                      'Select the type of adjustment: Percentage or Fixed Amount',
                      'text',
                      ['Percentage', 'Fixed Amount']
                    )}
                    {renderInputField(
                      'Adjustment Value',
                      adjustmentValue,
                      setAdjustmentValue,
                      'Enter the value of adjustment (e.g., 0.1 for 0.1% or $0.1). Use negative values for rate decreases.',
                      'number',
                      null,
                      null,
                      null,
                      0.01
                    )}
                    {renderInputField(
                      'Adjustment Frequency (Payments)',
                      adjustmentPatternFrequency,
                      setAdjustmentPatternFrequency,
                      'Enter how often the interest rate adjusts (e.g., every 1 payment)',
                      'number',
                      null,
                      1,
                      480,
                      1
                    )}
                    {renderInputField(
                      'Number of Adjustments',
                      adjustmentDuration,
                      setAdjustmentDuration,
                      'Enter the total number of adjustments to apply',
                      'number',
                      null,
                      1,
                      480,
                      1
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Manual Rate Adjustments */}
          {!useRateAdjustmentPattern && !useRandomAdjustments && (
            <div>
              <Label>Rate Adjustments</Label>
              <div className="space-y-4">
                {rateAdjustments.map((adjustment, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="date"
                      value={adjustment.effectiveDate}
                      onChange={(e) => {
                        const newAdjustments = [...rateAdjustments];
                        newAdjustments[index].effectiveDate = e.target.value;
                        setRateAdjustments(newAdjustments);
                      }}
                    />
                    <Input
                      type="number"
                      value={adjustment.indexRate}
                      onChange={(e) => {
                        const newAdjustments = [...rateAdjustments];
                        newAdjustments[index].indexRate = e.target.value;
                        setRateAdjustments(newAdjustments);
                      }}
                      placeholder="Index Rate (%)"
                    />
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const newAdjustments = rateAdjustments.filter((_, i) => i !== index);
                        setRateAdjustments(newAdjustments);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    setRateAdjustments([...rateAdjustments, { effectiveDate: '', indexRate: '' }]);
                  }}
                >
                  Add Rate Adjustment
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

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
            <CardTitle className="text-3xl font-bold text-primary">POWERFULMOVES LOAN CALCULATOR</CardTitle>
            <p className="text-xl">PMOVES Edition</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="loan-input">
                <AccordionTrigger>Loan Input</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {renderInputField(
                      'Loan Amount',
                      loanAmount,
                      setLoanAmount,
                      'Enter the total amount you wish to borrow (e.g., 20000)',
                      'number',
                      null,
                      0,
                      10000000,
                      500
                    )}
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
                    {renderInputField(
                      'Payment Amount (Optional)',
                      paymentAmount,
                      setPaymentAmount,
                      'Enter your desired payment amount or leave blank to calculate it',
                      'number',
                      null,
                      0,
                      null,
                      0.01,
                      !customPaymentAmount
                    )}
                    {renderInputField(
                      'Interest Rate (%)',
                      annualInterestRate,
                      setAnnualInterestRate,
                      'Enter the annual interest rate (e.g., 5.5)',
                      'number',
                      null,
                      0,
                      50,
                      0.1,
                      isAdjustableRate
                    )}
                    {renderAdjustableRateFields()}
                    {renderInputField(
                      'Loan Term (Payments)',
                      loanTerm,
                      setLoanTerm,
                      'Enter the loan term in number of payments (e.g., 60)',
                      'number',
                      null,
                      1,
                      480,
                      1
                    )}
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
                    {useDifferentAmortTerm &&
                      renderInputField(
                        'Amortization Term (Payments)',
                        amortTerm,
                        setAmortTerm,
                        'Enter the amortization term in number of payments (e.g., 360)',
                        'number',
                        null,
                        1,
                        480,
                        1
                      )}
                    {renderInputField(
                      'Additional Principal',
                      additionalPrincipal,
                      setAdditionalPrincipal,
                      'Enter any additional principal payments per period (e.g., 100)',
                      'number'
                    )}
                    {renderInputField(
                      'Payment Frequency',
                      paymentFrequency,
                      setPaymentFrequency,
                      'Select payment frequency',
                      'text',
                      ['Monthly', 'Biweekly', 'Weekly']
                    )}
                    {renderInputField(
                      'First Due Date',
                      firstDueDate,
                      setFirstDueDate,
                      'Select first payment due date',
                      'date'
                    )}
                    {renderInputField(
                      'Days Method',
                      daysMethod,
                      (value) => {
                        setDaysMethod(value);
                      },
                      'Select days method for interest calculation',
                      'text',
                      ['Actual', '30 Day Month']
                    )}
                    {renderInputField(
                      'Year Basis',
                      yearBasis,
                      (value) => {
                        setYearBasis(value);
                      },
                      'Select the year basis for interest calculations',
                      'text',
                      ['360', '365', '366']
                    )}

                    <div className="flex items-center justify-center space-x-2">
                      <Checkbox
                        id="creditInsurance"
                        checked={creditInsurance}
                        onCheckedChange={handleCheckboxChange(setCreditInsurance)}
                      />
                      <Label htmlFor="creditInsurance">Include Credit Insurance</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-center">
              <Button
                onClick={handleCalculate}
                className="w-full max-w-xs bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-3 px-6 rounded-md shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
              >
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
              <Progress
                value={progress}
                className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${progress}%` }}
                />
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
                      <AccordionContent>{renderLoanSummary()}</AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment-breakdown">
                      <AccordionTrigger>Payment Breakdown Chart</AccordionTrigger>
                      <AccordionContent>{renderPaymentBreakdownChart()}</AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="amortization-schedule">
                      <AccordionTrigger>Amortization Schedule</AccordionTrigger>
                      <AccordionContent>{renderAmortizationSchedule()}</AccordionContent>
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