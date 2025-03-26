import React from 'react';
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

export const BalanceChart = ({ history, metrics }) => {
  const data = history.map(item => ({
    date: formatDate(item.timestamp),
    balance: item.total_balance,
    timestamp: item.timestamp,
  }));

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={6}>
      <GridItem colSpan={4}>
        <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text color="gray.400" fontSize="sm">Balance History</Text>
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
    </Grid>
  );
};
