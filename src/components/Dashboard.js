import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  SimpleGrid,
} from '@chakra-ui/react';
import { RepeatIcon, DeleteIcon, LockIcon } from '@chakra-ui/icons';
import { exchangeService } from '../services/exchangeService';
import { balanceHistoryService, TIME_RANGES } from '../services/balanceHistoryService';
import { BalanceChart } from './BalanceChart';

export const Dashboard = () => {
  const [balances, setBalances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState(TIME_RANGES.MONTH);

  useEffect(() => {
    const loadHistory = async () => {
      const historyData = await balanceHistoryService.getHistory(timeRange);
      const metricsData = await balanceHistoryService.getMetrics();
      setHistory(historyData);
      setMetrics(metricsData);
    };

    loadHistory();
  }, [timeRange]);

  const renderExchangeContent = (exchangeName) => {
    const exchangeData = balances.find((b) => b.exchange === exchangeName);
    return (
      <>
        <Text color="brand.400" fontSize="lg" fontWeight="bold">
          Balance: ${exchangeData?.totalUSD.toLocaleString() || '0'}
        </Text>
        {exchangeData?.error && (
          <Text color="red.500" fontSize="sm">
            Error: {exchangeData.error}
          </Text>
        )}
        {exchangeData?.balances && exchangeData.balances.length > 0 && (
          <TableContainer>
            <Table size="sm" variant="unstyled">
              <Thead>
                <Tr>
                  <Th color="gray.400" pl={0}>Asset</Th>
                  <Th color="gray.400" isNumeric pr={0}>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {exchangeData.balances.map((balance) => (
                  <Tr key={balance.asset} _hover={{ bg: 'gray.800' }}>
                    <Td color="white" pl={0}>{balance.asset}</Td>
                    <Td color="white" isNumeric pr={0}>{balance.total.toFixed(8)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  };

  const fetchBalances = async () => {
    try {
      console.log('Starting to fetch balances...');
      setIsLoading(true);
      const data = await exchangeService.getAllBalances();
      console.log('Received balances from exchanges:', data);
      setBalances(data);

      // Save balance history
      const totalUSD = data.reduce((sum, exchange) => sum + exchange.totalUSD, 0);
      console.log('Saving new balance history with total USD:', totalUSD);
      const updatedHistory = await balanceHistoryService.saveBalance(totalUSD, data);

      // Update history and metrics
      console.log('Updating history and metrics...');
      setHistory(updatedHistory);
      const newMetrics = await balanceHistoryService.getMetrics();
      console.log('New metrics:', newMetrics);
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error in fetchBalances:', error);
      toast({
        title: 'Error fetching balances',
        description: 'Please check your API credentials and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      console.log('Finished fetching balances');
    }
  };

  const handleSetCredentials = (exchange, accountIndex) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setSelectedAccountIndex(accountIndex);
    onOpen();
  };

  const handleSaveCredentials = () => {
    exchangeService.setCredentials(
      selectedExchange,
      apiKey,
      apiSecret,
      selectedExchange.toLowerCase() === 'okx' ? passphrase : undefined,
      selectedAccountIndex
    );
    toast({
      title: 'Credentials saved',
      description: `${selectedExchange} API credentials have been saved`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    onClose();
  };

  const handleClearCredentials = () => {
    exchangeService.clearCredentials();
    setBalances([]);
    toast({
      title: 'Credentials cleared',
      description: 'All API credentials have been removed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const getTotalBalance = () => {
    return balances.reduce((sum, exchange) => sum + exchange.totalUSD, 0);
  };

  const handleTimeRangeChange = async (newRange) => {
    setTimeRange(newRange);
  };

  return (
    <Box bg="#14142B" minH="100vh">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between" mb={6}>
            <VStack align="start" spacing={1}>
              <Heading size="lg" color="white" fontWeight="bold">
                Moony Money Dashboard
              </Heading>
              <Text color="gray.400">
                Manage your crypto portfolio across exchanges
              </Text>
            </VStack>
            <HStack>
              <Button
                bg="brand.500"
                color="white"
                onClick={fetchBalances}
                isLoading={isLoading}
                _hover={{ bg: 'brand.600' }}
                leftIcon={<RepeatIcon />}
              >
                Refresh Balances
              </Button>
              <Button
                variant="outline"
                colorScheme="purple"
                onClick={async () => {
                  try {
                    await balanceHistoryService.deleteOldRecords();
                    toast({
                      title: 'Old records deleted',
                      description: 'Successfully deleted records before March 28, 2025',
                      status: 'success',
                      duration: 5000,
                      isClosable: true,
                    });
                    // Refresh the history
                    const historyData = await balanceHistoryService.getHistory();
                    const metricsData = await balanceHistoryService.getMetrics();
                    setHistory(historyData);
                    setMetrics(metricsData);
                  } catch (error) {
                    toast({
                      title: 'Error deleting old records',
                      description: error.message,
                      status: 'error',
                      duration: 5000,
                      isClosable: true,
                    });
                  }
                }}
              >
                Clean Old Data
              </Button>
              <Tooltip label="Clear all API credentials">
                <Button
                  variant="outline"
                  borderColor="red.500"
                  color="red.500"
                  onClick={handleClearCredentials}
                  _hover={{ bg: 'rgba(229, 62, 62, 0.1)' }}
                  leftIcon={<DeleteIcon />}
                >
                  Clear All Credentials
                </Button>
              </Tooltip>
            </HStack>
          </HStack>

          <Card bg="gray.900" borderRadius="xl" border="1px solid" borderColor="gray.800">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Stat>
                  <StatLabel color="gray.400">Total Portfolio Value</StatLabel>
                  <StatNumber fontSize="3xl" color="white">
                    ${getTotalBalance().toLocaleString()}
                  </StatNumber>
                  <StatHelpText color="brand.400">Across all exchanges</StatHelpText>
                </Stat>

                <Accordion allowToggle>
                  <AccordionItem border="none">
                    <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                      <Text color="brand.400" flex="1" textAlign="left">
                        View Exchange Details
                      </Text>
                      <AccordionIcon color="brand.400" />
                    </AccordionButton>
                    <AccordionPanel pb={4} px={0}>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                        <Card bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                          <CardBody>
                            <VStack align="stretch" spacing={4}>
                              <Heading size="md" color="white">Bybit</Heading>
                              {renderExchangeContent('Bybit')}
                              <Button
                                size="sm"
                                onClick={() => handleSetCredentials('Bybit')}
                                bg="brand.500"
                                color="white"
                                _hover={{ bg: 'brand.600' }}
                                leftIcon={<LockIcon />}
                              >
                                Set API Credentials
                              </Button>
                            </VStack>
                          </CardBody>
                        </Card>

                        <Card bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                          <CardBody>
                            <VStack align="stretch" spacing={4}>
                              <Heading size="md" color="white">OKX 1</Heading>
                              {renderExchangeContent('OKX 1')}
                              <Button
                                size="sm"
                                onClick={() => handleSetCredentials('OKX', 0)}
                                bg="brand.500"
                                color="white"
                                _hover={{ bg: 'brand.600' }}
                                leftIcon={<LockIcon />}
                              >
                                Set API Credentials
                              </Button>
                            </VStack>
                          </CardBody>
                        </Card>

                        <Card bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                          <CardBody>
                            <VStack align="stretch" spacing={4}>
                              <Heading size="md" color="white">OKX 2</Heading>
                              {renderExchangeContent('OKX 2')}
                              <Button
                                size="sm"
                                onClick={() => handleSetCredentials('OKX', 1)}
                                bg="brand.500"
                                color="white"
                                _hover={{ bg: 'brand.600' }}
                                leftIcon={<LockIcon />}
                              >
                                Set API Credentials
                              </Button>
                            </VStack>
                          </CardBody>
                        </Card>

                        <Card bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
                          <CardBody>
                            <VStack align="stretch" spacing={4}>
                              <Heading size="md" color="white">Cash</Heading>
                              {renderExchangeContent('Cash')}
                            </VStack>
                          </CardBody>
                        </Card>
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </VStack>
            </CardBody>
          </Card>

          <BalanceChart
            history={history}
            metrics={metrics}
            onTimeRangeChange={handleTimeRangeChange}
          />
        </VStack>
      </Container>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="gray.900" borderRadius="xl">
          <ModalHeader color="white">Set {selectedExchange} API Credentials</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="gray.400">API Key</FormLabel>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                  _hover={{ borderColor: 'brand.500' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                />
              </FormControl>
              <FormControl>
                <FormLabel color="gray.400">API Secret</FormLabel>
                <Input
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                  _hover={{ borderColor: 'brand.500' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                />
              </FormControl>
              {selectedExchange.toLowerCase() === 'okx' && (
                <FormControl>
                  <FormLabel color="gray.400">Passphrase</FormLabel>
                  <Input
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter Passphrase"
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.700"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ borderColor: 'brand.500' }}
                    _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                  />
                </FormControl>
              )}
              <Button
                bg="brand.500"
                color="white"
                width="100%"
                onClick={handleSaveCredentials}
                leftIcon={<LockIcon />}
              >
                Save Credentials
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
