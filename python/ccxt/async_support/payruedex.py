# -*- coding: utf-8 -*-

# PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
# https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

from ccxt.async_support.base.exchange import Exchange
import math
from ccxt.base.errors import ExchangeError
from ccxt.base.errors import AuthenticationError
from ccxt.base.errors import ArgumentsRequired
from ccxt.base.errors import InsufficientFunds
from ccxt.base.errors import InvalidOrder


class payruedex(Exchange):

    def describe(self):
        return self.deep_extend(super(payruedex, self).describe(), {
            'id': 'payruedex',
            'name': 'payruedex',
            'countries': ['US'],
            'rateLimit': 1500,
            'certified': False,
            'requiresWeb3': True,
            'requiresEthAbi': True,
            'has': {
                'fetchOrderBook': True,
                'fetchTicker': True,
                'fetchTickers': True,
                'fetchMarkets': True,
                'fetchBalance': True,
                'createOrder': True,
                'fetchOHLCV': True,
                'cancelOrder': True,
                'fetchOpenOrders': True,
                'fetchTrades': False,
                'fetchMyTrades': True,
                'withdraw': True,
                'fetchTradingFees': False,
            },
            'timeframes': {
                '1m': '1m',
                '3m': '3m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m',  # default
                '1h': '1h',
                '4h': '4h',
                '1d': '1d',
                '1w': '1w',
                '1M': '1M',
            },
            'urls': {
                'test': 'https://exchange.payrue.com',
                'logo': 'https://payrue.com/assets/img/svg/new/logo.svg',
                'api': 'https://exchange.payrue.com/trade/api/v2',
                'www': 'https://exchange.payrue.com',
                'doc': [
                    'https://exchange.payrue.com',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'info',
                        'order_book',
                        'price_history',
                        'trade_history',
                        'estimate_market_order',
                        'rates',
                        'ohlcv',
                    ],
                },
                'private': {
                    'post': [
                        'submit_order',
                        'cancel_order',
                        'deposit',
                        'withdraw',
                        'register_address',
                    ],
                },
            },
            'options': {
                'contractAddress': '0x205b2af20A899ED61788300C5b268c512D6b1CCE',  # 0x205b2af20A899ED61788300C5b268c512D6b1CCE
                'orderNonce': None,
                'exchange': 'ethereum',
                'ten': 10,
            },
            'exceptions': {
                'Invalid order signature. Please try again.': AuthenticationError,
                'You have insufficient funds to match self order. If you believe self is a mistake please refresh and try again.': InsufficientFunds,
                'Order no longer available.': InvalidOrder,
            },
            'requiredCredentials': {
                'walletAddress': True,
                'privateKey': True,
                'apiKey': True,
                'secret': False,
            },
            'commonCurrencies': {
                'dent': 'DENT',
                'dai': 'Dai Stablecoin',
            },
        })

    async def fetch_markets(self, params={}):
        # idex does not have an endpoint for markets
        # instead we generate the markets from the endpoint for currencies
        request = {
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
        }
        markets = await self.publicGetInfo(request)
        currenciesById = {}
        currencies = markets['tokenPairs']
        for i in range(0, len(currencies)):
            currency = currencies[i]
            currenciesById[currency['slug']] = currency
        result = []
        limits = {
            'amount': {
                'min': None,
                'max': None,
            },
            'price': {
                'min': None,
                'max': None,
            },
            'cost': {
                'min': None,
                'max': None,
            },
        }
        quotes = markets['tokenPairs']
        # keys = list(quotes.keys())
        for i in range(0, len(quotes)):
            baseId = quotes[i]['tokenBase']['symbol']
            quoteId = quotes[i]['tokenQuote']['symbol']
            quote = self.safe_currency_code(quoteId)
            base = self.safe_currency_code(baseId)
            symbol = baseId + '/' + quoteId
            result.append({
                'symbol': symbol,
                'precision': {'cost': quotes[i]['tokenBase']['decimalPlaces']},
                'base': base,
                'quote': quote,
                'baseId': base.lower(),
                'quoteId': quote.lower(),
                'limits': limits,
                'id': quotes[i]['slug'],
                'info': quotes[i],
                'tierBased': False,
                'active': True,
            })
        return result

    def parse_ticker(self, ticker, market=None):
        print(ticker)
        print(market)
        symbol = None
        if market:
            symbol = market['symbol']
        baseVolume = self.safe_float(ticker, 'totalVolume')
        quoteVolume = self.safe_float(ticker, 'totalVolumeQuote')
        baseDecimals = ticker['tokenBase']['decimalPlaces']
        quoteDecimals = ticker['tokenQuote']['decimalPlaces']
        priceLastNum = ticker['priceLastNumerator']
        priceLastDenum = ticker['priceLastDenominator']
        priceHighNum = ticker['priceHighNumerator']
        priceHighDenum = ticker['priceHighDenominator']
        priceLowNum = ticker['priceLowNumerator']
        priceLowDenum = ticker['priceLowDenominator']
        priceLast = 0
        if priceLastNum != 0:
            priceLast = self.get_price(quoteDecimals, baseDecimals, priceLastNum, priceLastDenum)
        priceHigh = 0
        if priceLastNum != 0:
            priceHigh = self.get_price(quoteDecimals, baseDecimals, priceHighNum, priceHighDenum)
        priceLow = 0
        if priceLastNum != 0:
            priceLow = self.get_price(quoteDecimals, baseDecimals, priceLowNum, priceLowDenum)
        last = priceLast
        amountInUnits = self.to_base_unit_amount(1, baseDecimals)
        estimatedPriceRequest = {
            'tm_access_key': self.apiKey,
            'exchange': 'ethereum',
            'tokenPair': market['id'],
            'amount': amountInUnits,
            'direction': 'sell',
        }
        lastAskResponse = self.publicGetEstimateMarketOrder(estimatedPriceRequest)
        estimatedPriceRequest['direction'] = 'buy'
        amountInUnits = self.to_base_unit_amount(1, quoteDecimals)
        estimatedPriceRequest['amount'] = amountInUnits
        lastAskPrice = self.to_unit_amount(self.safe_float(lastAskResponse['estimatedPrice'], 'approx'), quoteDecimals)
        lastBidResponse = self.publicGetEstimateMarketOrder(estimatedPriceRequest)
        lastBidPrice = self.to_unit_amount(self.safe_float(lastBidResponse['estimatedPrice'], 'approx'), quoteDecimals)
        return {
            'symbol': symbol,
            'timestamp': None,
            'datetime': None,
            'high': priceHigh,
            'low': priceLow,
            'bid': lastBidPrice,
            'bidVolume': None,
            'ask': lastAskPrice,
            'askVolume': None,
            'vwap': None,
            'open': None,
            'close': last,
            'last': last,
            'previousClose': None,
            'change': None,
            'percentage': None,
            'average': None,
            'baseVolume': quoteVolume,
            'quoteVolume': baseVolume,
            'info': ticker,
        }

    async def fetch_ohlcv(self, symbol, timeframe='1h', since=None, limit=None, params={}):
        await self.load_markets()
        # market = self.market(symbol)
        #
        #  request = {
        #     'time_range': interval,
        # }
        #
        if since is None:
            since = ''
        market = self.market(symbol)
        id = market['id']
        parameters = {
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
            'interval': timeframe,
            'since': since,
            'pair': id,
        }
        response = await self.publicGetOhlcv(self.extend(parameters, params))
        return response['ohlcv']
        # response = await self.publicGetInfo(self.extend(parameters, params))
        # tokenpairs = response['tokenPairs']
        # result = {}
        # for i in range(0, len(tokenpairs)):
        #     # print(tokenpairs[i]['tokenBase']['symbol'])
        #     # print(ids[0])
        #     if tokenpairs[i]['tokenBase']['symbol'] == ids[0]:
        #         result = tokenpairs[i]
        #     }
        # }
        #  # print(result)
        # baseVolume = self.safe_float(result, 'totalVolume')
        # baseDecimals = result['tokenBase']['decimalPlaces']
        # quoteDecimals = result['tokenQuote']['decimalPlaces']
        # priceLastNum = result['priceLastNumerator']
        # priceLastDenum = result['priceLastDenominator']
        # priceHighNum = result['priceHighNumerator']
        # priceHighDenum = result['priceHighDenominator']
        # priceLowNum = result['priceLowNumerator']
        # priceLowDenum = result['priceLowDenominator']
        # priceLast = 0
        # if priceLastNum != 0:
        #     priceLast = self.get_price(quoteDecimals, baseDecimals, priceLastNum, priceLastDenum)
        # }
        # priceHigh = 0
        # if priceLastNum != 0:
        #     priceHigh = self.get_price(quoteDecimals, baseDecimals, priceHighNum, priceHighDenum)
        # }
        # priceLow = 0
        # if priceLastNum != 0:
        #     priceLow = self.get_price(quoteDecimals, baseDecimals, priceLowNum, priceLowDenum)
        # }
        #  # ohlcvElement = {
        #  #     'date': self.milliseconds(),  # utc timestamp millis
        #  #     'open': priceLast,  # open price float
        #  #     'high': priceHigh,  # highest float
        #  #     'low': priceLow,  # lowest float
        #  #     'close': priceLast,  # closing
        #  #     'volume': baseVolume,  # volume
        #  # }
        # ohlcvElement1 = [
        #     self.milliseconds(),  # utc timestamp millis
        #     priceLast,  # open price float
        #     priceHigh,  # highest float
        #     priceLow,  # lowest float
        #     priceLast,  # closing
        #     baseVolume,  # volume
        # ]
        # ohlcvElement2 = [
        #     self.milliseconds(),  # utc timestamp millis
        #     priceLast,  # open price float
        #     priceHigh,  # highest float
        #     priceLow,  # lowest float
        #     priceLast,  # closing
        #     baseVolume,  # volume
        # ]
        # ohlcv = [ohlcvElement1, ohlcvElement2]
        # print(ohlcv)
        # return ohlcv

    async def fetch_tickers(self, symbols=None, params={}):
        parameters = {
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
        }
        await self.load_markets(parameters)
        response = await self.publicGetInfo(self.extend(parameters, params))
        tokenpairs = response['tokenPairs']
        result = {}
        for i in range(0, len(tokenpairs)):
            id = tokenpairs[i]['slug']
            # quoteId = tokenpairs[i]['tokenQuote']['slug']
            symbol = None
            market = None
            if id in self.markets_by_id:
                market = self.markets_by_id[id]
                symbol = market['symbol']
            else:
                # [quoteId, baseId] = id.split('_')
                baseId = tokenpairs[i]['tokenBase']['symbol']
                quoteId = tokenpairs[i]['tokenQuote']['symbol']
                symbol = baseId + '/' + quoteId
                market = {'symbol': symbol}
            ticker = tokenpairs[i]
            result[symbol] = self.parse_ticker(ticker, market)
        return result

    async def fetch_ticker(self, symbol, params={}):
        await self.load_markets()
        market = self.market(symbol)
        request = {
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
        }
        response = await self.publicGetInfo(self.extend(request, params))
        ticker = None
        ids = symbol.split('/')
        for i in range(0, len(response['tokenPairs'])):
            if response['tokenPairs'][i]['name'] == ids[0]:
                ticker = response['tokenPairs'][i]
        if ticker is None:
            raise ExchangeError('No tickers for symbol:' + market['symbol'])
        return self.parse_ticker(ticker, market)

    async def fetch_order_book(self, symbol, limit=None, params={}):
        await self.load_markets()
        market = self.market(symbol)
        id = market['id']
        request = {
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
            'tokenPair': id,
        }
        response = await self.publicGetOrderBook(self.extend(request, params))
        print(response)
        return self.parse_order_book(response, None, 'bids', 'asks', 'price', 'amount')

    def parse_bid_ask(self, bidAsk, priceKey=0, amountKey=1):
        priceStruct = bidAsk[priceKey]
        price = float(priceStruct['denominator']) / float(priceStruct['numerator'])
        amount = float(bidAsk[amountKey]['total'])
        # price = self.safe_float(bidAsk, priceKey)
        # amount = self.safe_float(bidAsk, amountKey)
        info = bidAsk
        return [price, amount, info]

    async def fetch_balance(self, params={}):
        request = {
            'address': self.walletAddress,
            'tm_access_key': self.apiKey,  # 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum',  # ethereum
        }
        response = await self.publicGetInfo(self.extend(request, params))
        result = {
            'info': response['user']['accounts'],
        }
        # keys = list(response.keys())
        addresses = response['user']['accounts']
        for i in range(0, len(addresses)):
            address = addresses[i]
            tokenBalances = address['tokenBalances']
            for j in range(0, len(tokenBalances)):
                currency = tokenBalances[j]
                decimals = currency['token']['decimalPlaces']
                code = self.safe_currency_code(currency['token']['symbol'])
                freeBase = self.safe_integer(currency, 'confirmed')
                usedBase = self.safe_integer(currency, 'locked')
                free = self.to_unit_amount(freeBase, decimals)
                used = self.to_unit_amount(usedBase, decimals)
                total = free + used
                result[code] = {
                    'free': free,
                    'used': used,
                    'total': total,
                }
        return self.parse_balance(result)

    def get_float_from_decimals(self, amount, decimals):
        return amount / math.pow(10, decimals)

    async def create_order(self, symbol, type, side, amount, price=None, params={}):
        self.check_required_dependencies()
        await self.load_markets()
        market = self.market(symbol)
        expires = '340282366920938463463374607431768211455'
        nonce = await self.get_nonce()
        sideInt = None
        baseDecimals = market['info']['tokenBase']['decimalPlaces']
        quoteDecimals = market['info']['tokenQuote']['decimalPlaces']
        amountBase = self.to_base_unit_amount(amount, baseDecimals)
        maxDenum = market['info']['priceHighDenominator']
        numerator = self.get_price_numerator(quoteDecimals, baseDecimals, maxDenum, price)
        if side == 'buy':
            sideInt = 0
            # numerator = self.get_price_numerator(baseDecimals, quoteDecimals, maxDenum, price)
        elif side == 'sell':
            sideInt = 1
        tokenAddress = market['info']['tokenBase']['address']
        if type == 'limit':
            requestToHash = {
                'exchange': self.web3.utils.toChecksumAddress('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction': sideInt,
                'address': self.web3.utils.toChecksumAddress(self.walletAddress),
                'tokenBaseAddress': self.web3.utils.toChecksumAddress(tokenAddress),
                'tokenQuoteAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': maxDenum,
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'nonce': nonce,
            }
            data = await self.getPayRueDexOrderHash(requestToHash)
            print(data)
            signature = self.signPayrueMessage(data, self.privateKey)
            print(signature)
            request = {
                'type': 'limit',
                'direction': side,
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': maxDenum,
                'tokenBaseAddress': self.web3.utils.toChecksumAddress('0xfca47962d45adfdfd1ab2d972315db4ce7ccf094'),
                'tokenQuoteAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'nonce': nonce,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'exchange': 'ethereum',
                'makerAddress': self.walletAddress,
                'signature': signature,
            }
            response = await self.privatePostSubmitOrder(request)  # self.extend(request, params) will cause invalid signature
            return self.parse_order(response['order'], market)
        elif type == 'market':
            estimatedPriceRequest = {
                'tm_access_key': self.apiKey,
                'exchange': 'ethereum',
                'tokenPair': market['id'],
                'amount': amountBase,
                'direction': side,
            }
            estimatedAmountResponse = await self.publicGetEstimateMarketOrder(estimatedPriceRequest)
            numerator = self.safe_integer(estimatedAmountResponse['estimatedPrice'], 'numerator')
            if numerator == 0:
                raise ExchangeError(market['symbol'] + ' market price is 0')
            denominator = self.safe_integer(estimatedAmountResponse['estimatedPrice'], 'denominator')
            requestToHash = {
                'exchange': self.web3.utils.toChecksumAddress('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction': sideInt,
                'address': self.web3.utils.toChecksumAddress(self.walletAddress),
                'tokenBaseAddress': self.web3.utils.toChecksumAddress(tokenAddress),
                'tokenQuoteAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': self.web3.utils.toChecksumAddress('0x0000000000000000000000000000000000000000'),
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': denominator,
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'nonce': nonce,
            }
            print(requestToHash)
            data = await self.getPayRueDexOrderHash(requestToHash)
            print(data)
            signature = self.signPayrueMessage(data, self.privateKey)
            print(signature)
            request = {
                'type': type,
                'direction': side,
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': denominator,
                'tokenBaseAddress': market['info']['tokenBase']['address'],
                'tokenQuoteAddress': market['info']['tokenQuote']['address'],
                'tokenFeeAddress': '0x0000000000000000000000000000000000000000',
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'nonce': nonce,
                'expirationTimestamp': expires,
                'exchange': 'ethereum',
                'makerAddress': self.walletAddress,
                'signature': signature,
            }
            response = await self.privatePostSubmitOrder(request)
            return self.parse_order(response['order'], market)

    def async_signing(self, types, values):
        hash = self.ethAbi.soliditySha3(types, values)
        orderHashString = self.web3.utils.toHex(hash)
        print(orderHashString)
        return self.signMessage(orderHashString, self.privateKey)

    async def get_nonce(self):
        return self.milliseconds()

    async def get_contract_address(self):
        return self.get_contract_address()

    async def get_num_denum(self, amount):
        priceNum = None
        priceDenum = None
        if float(amount) == int(amount):
            priceNum = amount
            priceDenum = 1
        else:
            length = (amount + len('')) - 2
            priceDenum = math.pow(10, length)
            priceNum = amount * priceDenum
            divisor = self.get_gcd(priceNum, priceDenum)
            priceNum /= divisor
            priceDenum /= divisor
        values = []
        values.append({
            'num': priceNum,
            'denum': priceDenum,
        })
        return values

    async def get_amount(self, num, denum):
        return num / denum

    def get_gcd(self, a, b):
        if b < 0.0000001:
            return a
        return self.get_gcd(b, int(math.floor(a % b)))

    def to_base_unit_amount(self, amount, decimals):
        # self is copied from 0xproject, MIT license
        unit = math.pow(10, decimals)
        return int(amount * unit)

    def to_unit_amount(self, amount, decimals):
        # self is copied from 0xproject, MIT license
        aUnit = math.pow(10, decimals)
        return(amount / aUnit)

    def get_price_numerator(self, quoteDecimals, baseDecimals, maxDenominator, price):
        decimalsDifference = quoteDecimals - baseDecimals
        decimalAdjustment = math.pow(10, decimalsDifference)
        return int(price * maxDenominator * decimalAdjustment)

    def get_price(self, quoteDecimals, baseDecimals, numerator, denominator):
        decimalsDifference = quoteDecimals - baseDecimals
        decimalAdjustment = math.pow(10, decimalsDifference)
        return numerator / denominator / decimalAdjustment

    def get_test_sign(self):
        sign = self.getPayRueDEXNewOrderHashv3()
        orderHashString = self.web3.utils.toHex(sign)
        message = self.signMessage(orderHashString, self.privateKey)
        print(sign)
        print(orderHashString)
        print(message)
        s = self.async_signing([
            'address',
            'uint8',
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
        ], [
            '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            1,
            '0x3fEaf47f1FDd9c692710818bd1CBfcB49B958050',
            '0xfca47962d45adfdfd1ab2d972315db4ce7ccf094',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            2000000,
            2000000,
            1,
            25,
            10000,
            2 ** 128 - 1,
            1575905216952,
        ])
        print(s)

    async def cancel_order(self, orderId, symbol=None, params={}):
        request = {
            'exchange': 'ethereum',
            'uuid': orderId,
        }
        response = await self.privatePostCancelOrder(self.extend(request))
        # {success: 1}
        if 'success' in response:
            return {
                'info': response,
            }
        else:
            raise ExchangeError(self.id + ' cancel order failed ' + self.json(response))

    async def fetch_open_orders(self, symbol=None, since=None, limit=None, params={}):
        await self.load_markets()
        request = {
            'tm_access_key': self.apiKey,
            'exchange': 'ethereum',
        }
        market = None
        if symbol is not None:
            market = self.market(symbol)
            request['market'] = market['id']
        response = await self.publicGetInfo(self.extend(request, params))
        orders = response['user']['orders']
        openOrders = []
        for i in range(0, len(orders)):
            if orders[i]['state'] == 'fillable':
                openOrders.append(orders[i])
        return self.parse_orders(openOrders, market, since, limit)

    async def fetch_order(self, id, symbol=None, params={}):
        await self.load_markets()
        market = None
        if symbol is not None:
            market = self.market(symbol)
        request = {
            'tm_access_key': self.apiKey,
            'exchange': 'ethereum',
        }
        response = await self.publicGetInfo(self.extend(request, params))
        allOrders = response['user']['orders']
        order = None
        for i in range(0, len(allOrders)):
            if allOrders[i]['uuid'] == id:
                order = allOrders[i]
        return self.parse_order(order, market)

    def parse_order(self, order, market=None):
        timestamp = self.safe_timestamp(order, 'createdAt')
        side = self.safe_string(order, 'direction')
        id = self.safe_string(order, 'uuid')
        symbol = order['tokenBase']['symbol'] + '/' + order['tokenQuote']['symbol']
        type = self.safe_string(order, 'type')
        numerator = order['price']['numerator']
        denominator = order['price']['denominator']
        quoteDecimals = order['tokenQuote']['decimalPlaces']
        baseDecimals = order['tokenBase']['decimalPlaces']
        price = self.get_price(quoteDecimals, baseDecimals, int(numerator), int(denominator))
        amountBase = self.safe_integer(order['amount'], 'total')
        amount = self.to_unit_amount(amountBase, baseDecimals)
        filledBase = self.safe_integer(order['amount'], 'filled')
        filled = self.to_unit_amount(filledBase, baseDecimals)
        remaining = amount - filled
        cost = filled * price
        return {
            'info': order,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': self.iso8601(timestamp),
            'side': side,
            'amount': amount,
            'price': price,
            'type': type,
            'filled': filled,
            'remaining': remaining,
            'cost': cost,
            'status': 'open',
        }

    def parse_order_status(self, status):
        statuses = {
            'open': 'open',
        }
        return self.safe_string(statuses, status, status)

    async def fetch_my_trades(self, symbol=None, since=None, limit=None, params={}):
        if self.walletAddress is None:
            raise ArgumentsRequired(self.id + ' fetchOpenOrders requires a walletAddress')
        if self.apiKey is None:
            raise ArgumentsRequired(self.id + ' fetchOpenOrders requires a apiKey')
        await self.load_markets()
        request = {
            'address': self.walletAddress,
            'tm_access_key': self.apiKey,
            'exchange': 'ethereum',
        }
        market = None
        # if limit is not None:
        #     request['start'] = int(int(math.floor(limit)))
        # }
        response = await self.publicGetInfo(self.extend(request, params))
        allOrders = response['user']['orders']
        trades = []
        for i in range(0, len(allOrders)):
            if allOrders[i]['state'] == 'fully_filled':
                trades.append(allOrders[i])
        if isinstance(trades, list):
            if symbol is not None:
                matchedOrders = []
                for i in range(0, len(trades)):
                    orderSymbol = trades[i]['tokenBase']['symbol'] + '/' + trades[i]['tokenQuote']['symbol']
                    if orderSymbol == symbol:
                        matchedOrders.append(trades[i])
                    return self.parse_trades(matchedOrders, market, since, limit)
            return self.parse_trades(trades, market, since, limit)
        else:
            result = []
            marketIds = list(response.keys())
            for i in range(0, len(marketIds)):
                marketId = marketIds[i]
                trades = response[marketId]
                parsed = self.parse_trades(trades, market, since, limit)
                result = self.array_concat(result, parsed)
            return result

    async def fetch_trades(self, symbol, since=None, limit=None, params={}):
        await self.load_markets()
        market = self.market(symbol)
        request = {
            'tokenPair': market['id'],
            'exchange': 'ethereum',
            'tm_access_key': self.apiKey,
        }
        if limit is not None:
            request['start'] = int(int(math.floor(limit)))
        response = await self.publicGetTradeHistory(self.extend(request, params))
        return self.parse_trades(response['history'], market, since, limit)

    def parse_trade(self, trade, market=None):
        # print(trade)
        timestamp = self.safe_timestamp(trade, 'createdAt')
        side = self.safe_string(trade, 'direction')
        id = self.safe_string(trade, 'uuid')
        symbol = trade['tokenBase']['symbol'] + '/' + trade['tokenQuote']['symbol']
        type = self.safe_string(trade, 'type')
        numerator = trade['price']['numerator']
        denominator = trade['price']['denominator']
        quoteDecimals = trade['tokenQuote']['decimalPlaces']
        baseDecimals = trade['tokenBase']['decimalPlaces']
        price = self.get_price(quoteDecimals, baseDecimals, int(numerator), int(denominator))
        # price = float(trade['price']['numerator']) / float(trade['price']['denominator'])
        amountBase = self.safe_integer(trade['amount'], 'total')
        amount = self.to_unit_amount(amountBase, baseDecimals)
        # amount = self.safe_integer(trade['amount'], 'total')
        cost = amount * price
        takerOrMaker = None
        if side == 'buy':
            takerOrMaker = 'taker'
        else:
            takerOrMaker = 'maker'
        return {
            'info': trade,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': self.iso8601(timestamp),
            'side': side,
            'amount': amount,
            'price': price,
            'type': type,
            'cost': cost,
            'status': 'closed',
            'takerOrMaker': takerOrMaker,
        }

    async def deposit(self, code, amount, txHash, params={}):
        self.check_required_dependencies()
        self.check_address(self.walletAddress)
        await self.load_markets()
        currency = self.currency(code)
        symbol = currency['code'] + '/' + 'ETH'
        market = self.market(symbol)
        tokenAddress = market['info']['tokenBase']['address']
        decimals = market['info']['tokenBase']['decimalPlaces']
        parsedAmount = self.to_base_unit_amount(amount, decimals)
        request = {
            'address': self.walletAddress,
            'tokenAddress': tokenAddress,
            'amount': parsedAmount,
            'fee': 0,
            'txHash': txHash,
            'exchange': 'ethereum',
        }
        response = await self.privatePostDeposit(self.extend(request, params))
        return {
            'info': response,
            'id': None,
        }

    async def withdraw(self, code, amount, address, tag=None, params={}):
        self.check_required_dependencies()
        self.check_address(address)
        await self.load_markets()
        currency = self.currency(code)
        symbol = currency['code'] + '/' + 'ETH'
        market = self.market(symbol)
        tokenAddress = market['info']['tokenBase']['address']
        decimals = market['info']['tokenBase']['decimalPlaces']
        nonce = await self.get_nonce()
        parsedAmount = self.to_base_unit_amount(amount, decimals)
        # amount = self.toWei(amount, 'ether', currency['precision'])
        requestToHash = {
            'contractAddress': '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            'tokenAddress': tokenAddress,
            'amount': parsedAmount,
            'address': address,
            'fee': 0,
            'nonce': nonce,
        }
        hash = self.get_pay_rue_dex_withdraw_hash(requestToHash)
        print(hash)
        signature = self.signMessage(hash, self.privateKey)
        print(signature)
        parsedSignature = signature  # ? need to parse sign to vrs
        request = {
            'address': address,
            'amount': parsedAmount,
            'tokenAddress': tokenAddress,
            'nonce': nonce,
            'fee': 0,
            'exchange': 'ethereum',
            'signature': parsedSignature,
        }
        response = await self.privatePostWithdraw(self.extend(request, params))
        return {
            'info': response,
            'id': None,
        }

    def sign(self, path, api='public', method='GET', params={}, headers=None, body=None):
        url = self.urls['api'] + '/' + path
        if method == 'POST':
            body = self.json(params)
            headers = {
                'Content-Type': 'application/json',
            }
            url += '?tm_access_key=' + self.apiKey
        else:
            if params:
                url += '?' + self.urlencode(params)
        return {'url': url, 'method': method, 'body': body, 'headers': headers}

    def get_pay_rue_dex_withdraw_hash(self, request):
        return self.soliditySha3([
            '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            request['tokenAddress'],
            request['address'],
            request['amount'],
            request['fee'],
            request['nonce'],
        ])

    def handle_errors(self, code, reason, url, method, headers, body, response, requestHeaders, requestBody):
        if response is None:
            return
        if 'error' in response:
            if response['error'] in self.exceptions:
                raise self.exceptions[response['error']](self.id + ' ' + response['error'])
            raise ExchangeError(self.id + ' ' + body)
