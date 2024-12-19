import React, { useState } from 'react';
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
  SimpleGrid,
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
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { exchangeService } from '../services/exchangeService';

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

  const renderExchangeContent = (exchangeName) => {
    const exchangeData = balances.find((b) => b.exchange === exchangeName);
    return (
      <>
        <Text>
          Balance: ${exchangeData?.totalUSD.toLocaleString() || '0'}
        </Text>
        {exchangeData?.error && (
          <Text color="red.500" fontSize="sm">
            Error: {exchangeData.error}
          </Text>
        )}
        {exchangeData?.balances && exchangeData.balances.length > 0 && (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Asset</Th>
                  <Th isNumeric>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {exchangeData.balances.map((balance) => (
                  <Tr key={balance.asset}>
                    <Td>{balance.asset}</Td>
                    <Td isNumeric>{balance.total.toFixed(8)}</Td>
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
      setIsLoading(true);
      const data = await exchangeService.getAllBalances();
      setBalances(data);
    } catch (error) {
      toast({
        title: 'Error fetching balances',
        description: 'Please check your API credentials and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
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

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Crypto Exchange Dashboard</Heading>
          <HStack>
            <Button
              colorScheme="blue"
              onClick={fetchBalances}
              isLoading={isLoading}
            >
              Refresh Balances
            </Button>
            <Tooltip label="Clear all API credentials">
              <Button
                colorScheme="red"
                variant="outline"
                onClick={handleClearCredentials}
              >
                Clear All Credentials
              </Button>
            </Tooltip>
          </HStack>
        </HStack>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Portfolio Value</StatLabel>
              <StatNumber>${getTotalBalance().toLocaleString()}</StatNumber>
              <StatHelpText>Across all exchanges</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">Bybit</Heading>
                {renderExchangeContent('Bybit')}
                <Button size="sm" onClick={() => handleSetCredentials('Bybit')}>
                  Set API Credentials
                </Button>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">OKX 1</Heading>
                {renderExchangeContent('OKX 1')}
                <Button size="sm" onClick={() => handleSetCredentials('OKX', 0)}>
                  Set API Credentials
                </Button>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">OKX 2</Heading>
                {renderExchangeContent('OKX 2')}
                <Button size="sm" onClick={() => handleSetCredentials('OKX', 1)}>
                  Set API Credentials
                </Button>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">Savings Bank</Heading>
                {renderExchangeContent('Savings Bank')}
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Set {selectedExchange} API Credentials</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>API Key</FormLabel>
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>API Secret</FormLabel>
                  <Input
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    type="password"
                    placeholder="Enter API Secret"
                  />
                </FormControl>
                {selectedExchange.toLowerCase() === 'okx' && (
                  <FormControl>
                    <FormLabel>Passphrase</FormLabel>
                    <Input
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      type="password"
                      placeholder="Enter Passphrase"
                    />
                  </FormControl>
                )}
                <Button
                  colorScheme="blue"
                  width="100%"
                  onClick={handleSaveCredentials}
                >
                  Save Credentials
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
};
