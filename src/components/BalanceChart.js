import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Grid,
  GridItem,
  Text,
  HStack,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatArrow,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TIME_RANGES } from '../services/balanceHistoryService';

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const MetricCard = ({ label, change, percentage }) => (
  <Stat>
    <StatLabel color="gray.400">{label}</StatLabel>
    <StatNumber fontSize="xl" color="white">
      <HStack spacing={2} align="center">
        <StatArrow type={percentage >= 0 ? 'increase' : 'decrease'} />
        <Text>{percentage.toFixed(2)}%</Text>
      </HStack>
    </StatNumber>
    <Text color={change >= 0 ? 'green.400' : 'red.400'} fontSize="sm">
      {formatUSD(change)}
    </Text>
  </Stat>
);

export const BalanceChart = ({ history, metrics, onTimeRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES.MONTH);

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    onTimeRangeChange(range);
  };

  const data = history.map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString(),
    balance: item.total_balance,
  }));

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={6}>
      {metrics && (
        <>
          <GridItem colSpan={1}>
            <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
              <CardBody>
                <MetricCard
                  label="24h Change"
                  change={metrics.daily.change}
                  percentage={metrics.daily.percentage}
                />
              </CardBody>
            </Card>
          </GridItem>
          <GridItem colSpan={1}>
            <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
              <CardBody>
                <MetricCard
                  label="7d Change"
                  change={metrics.weekly.change}
                  percentage={metrics.weekly.percentage}
                />
              </CardBody>
            </Card>
          </GridItem>
          <GridItem colSpan={1}>
            <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
              <CardBody>
                <MetricCard
                  label="30d Change"
                  change={metrics.monthly.change}
                  percentage={metrics.monthly.percentage}
                />
              </CardBody>
            </Card>
          </GridItem>
        </>
      )}

      <GridItem colSpan={4}>
        <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between" align="center">
                <Text color="gray.400" fontSize="sm">Balance History</Text>
                <ButtonGroup size="sm" isAttached variant="outline">
                  <Button
                    onClick={() => handleRangeChange(TIME_RANGES.WEEK)}
                    colorScheme={selectedRange === TIME_RANGES.WEEK ? 'purple' : 'gray'}
                  >
                    7D
                  </Button>
                  <Button
                    onClick={() => handleRangeChange(TIME_RANGES.MONTH)}
                    colorScheme={selectedRange === TIME_RANGES.MONTH ? 'purple' : 'gray'}
                  >
                    30D
                  </Button>
                  <Button
                    onClick={() => handleRangeChange(TIME_RANGES.QUARTER)}
                    colorScheme={selectedRange === TIME_RANGES.QUARTER ? 'purple' : 'gray'}
                  >
                    90D
                  </Button>
                  <Button
                    onClick={() => handleRangeChange(TIME_RANGES.ALL)}
                    colorScheme={selectedRange === TIME_RANGES.ALL ? 'purple' : 'gray'}
                  >
                    ALL
                  </Button>
                </ButtonGroup>
              </HStack>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                    <defs>
                      <linearGradient id="balance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis
                      dataKey="date"
                      stroke="#718096"
                      tick={{ fill: '#718096' }}
                    />
                    <YAxis
                      stroke="#718096"
                      tick={{ fill: '#718096' }}
                      tickFormatter={(value) => formatUSD(value)}
                      width={80}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A202C',
                        border: '1px solid #2D3748',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#718096' }}
                      formatter={(value) => [formatUSD(value), 'Balance']}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#balance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </VStack>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
};
