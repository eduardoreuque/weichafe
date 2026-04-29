#!/usr/bin/env node

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value, decimals = 2) {
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const usdToClp = toNumber(process.env.USD_TO_CLP, 950);
const hoursPerMonth = toNumber(process.env.HOURS_PER_MONTH, 730);

// Valores por defecto aproximados para us-east-1
const ec2HourlyUsd = toNumber(process.env.EC2_HOURLY_USD, 0.0104);
const ebsGbMonthUsd = toNumber(process.env.EBS_GB_MONTH_USD, 0.08);
const ebsGb = toNumber(process.env.EBS_GB, 8);
const dataOutGb = toNumber(process.env.DATA_OUT_GB, 0);
const dataOutGbUsd = toNumber(process.env.DATA_OUT_GB_USD, 0.09);

const monthlyEc2Usd = ec2HourlyUsd * hoursPerMonth;
const monthlyEbsUsd = ebsGbMonthUsd * ebsGb;
const monthlyDataUsd = dataOutGb * dataOutGbUsd;
const monthlyTotalUsd = monthlyEc2Usd + monthlyEbsUsd + monthlyDataUsd;

const annualTotalUsd = monthlyTotalUsd * 12;
const monthlyTotalClp = monthlyTotalUsd * usdToClp;
const annualTotalClp = annualTotalUsd * usdToClp;

console.log("\nWEICHAFE - CALCULADORA DE COSTOS AWS\n");
console.log("Parametros usados:");
console.log(`- Tipo EC2: t3.micro`);
console.log(`- Horas/mes: ${hoursPerMonth}`);
console.log(`- Precio EC2 por hora (USD): ${ec2HourlyUsd}`);
console.log(`- EBS (GB): ${ebsGb}`);
console.log(`- Precio EBS por GB-mes (USD): ${ebsGbMonthUsd}`);
console.log(`- Transferencia salida (GB/mes): ${dataOutGb}`);
console.log(`- Precio salida por GB (USD): ${dataOutGbUsd}`);
console.log(`- Tipo cambio USD->CLP: ${usdToClp}\n`);

console.log("Detalle mensual (USD):");
console.log(`- EC2: USD ${money(monthlyEc2Usd)}`);
console.log(`- EBS: USD ${money(monthlyEbsUsd)}`);
console.log(`- Transferencia: USD ${money(monthlyDataUsd)}`);
console.log(`- TOTAL MENSUAL: USD ${money(monthlyTotalUsd)}\n`);

console.log("Totales cliente:");
console.log(`- MENSUAL: USD ${money(monthlyTotalUsd)} | CLP ${money(monthlyTotalClp, 0)}`);
console.log(`- ANUAL:   USD ${money(annualTotalUsd)} | CLP ${money(annualTotalClp, 0)}\n`);

console.log("Escenarios rapidos (CLP):");
const low = monthlyTotalClp;
const medium = (monthlyTotalUsd + 2) * usdToClp;
const high = (monthlyTotalUsd + 5) * usdToClp;
console.log(`- Base:      CLP ${money(low, 0)}/mes | CLP ${money(low * 12, 0)}/ano`);
console.log(`- Medio:     CLP ${money(medium, 0)}/mes | CLP ${money(medium * 12, 0)}/ano`);
console.log(`- Conserv.:  CLP ${money(high, 0)}/mes | CLP ${money(high * 12, 0)}/ano\n`);

console.log("Tip: puedes ajustar valores con variables de entorno, por ejemplo:");
console.log("USD_TO_CLP=980 DATA_OUT_GB=20 npm run cost:estimate\n");
