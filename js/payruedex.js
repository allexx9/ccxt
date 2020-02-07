'use strict';

// ---------------------------------------------------------------------------
// let ethAbi = undefined;
// try {
//     const requireFunction = require;
//     ethAbi = requireFunction ('ethereumjs-abi'); // eslint-disable-line global-require
//     // we prefer bignumber.js over BN.js
//     // BN        = requireFunction ('bn.js') // eslint-disable-line global-require
// } catch (e) {
//     // nothing
// }
const Exchange = require ('./base/Exchange');
const { ExchangeError, ArgumentsRequired, AuthenticationError, InsufficientFunds, InvalidOrder } = require ('./base/errors');

// ---------------------------------------------------------------------------

module.exports = class payruedex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'payruedex',
            'name': 'payruedex',
            'countries': ['US'],
            'rateLimit': 1500,
            'certified': false,
            'requiresWeb3': true,
            'requiresEthAbi': true,
            'has': {
                'fetchOrderBook': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchMarkets': true,
                'fetchBalance': true,
                'createOrder': true,
                'fetchOHLCV': true,
                'cancelOrder': true,
                'fetchOpenOrders': true,
                'fetchTrades': false,
                'fetchMyTrades': true,
                'withdraw': true,
                'fetchTradingFees': false,
            },
            'timeframes': {
                '1m': '1m',
                '3m': '3m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m', // default
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
                'contractAddress': '0x205b2af20A899ED61788300C5b268c512D6b1CCE',  // 0x205b2af20A899ED61788300C5b268c512D6b1CCE
                'orderNonce': undefined,
                'exchange': 'ethereum',
                'ten': 10,
            },
            'exceptions': {
                'Invalid order signature. Please try again.': AuthenticationError,
                'You have insufficient funds to match this order. If you believe this is a mistake please refresh and try again.': InsufficientFunds,
                'Order no longer available.': InvalidOrder,
            },
            'requiredCredentials': {
                'walletAddress': true,
                'privateKey': true,
                'apiKey': true,
                'secret': false,
            },
            'commonCurrencies': {
                'dent': 'DENT',
                'dai': 'Dai Stablecoin',
            },
        });
    }

    async fetchMarkets (params = {}) {
        // idex does not have an endpoint for markets
        // instead we generate the markets from the endpoint for currencies
        const request = {
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
        };
        const markets = await this.publicGetInfo (request);
        const currenciesById = {};
        const currencies = markets['tokenPairs'];
        for (let i = 0; i < currencies.length; i++) {
            const currency = currencies[i];
            currenciesById[currency['slug']] = currency;
        }
        const result = [];
        const limits = {
            'amount': {
                'min': undefined,
                'max': undefined,
            },
            'price': {
                'min': undefined,
                'max': undefined,
            },
            'cost': {
                'min': undefined,
                'max': undefined,
            },
        };
        const quotes = markets['tokenPairs'];
        // const keys = Object.keys (quotes);
        for (let i = 0; i < quotes.length; i++) {
            const baseId = quotes[i]['tokenBase']['symbol'];
            const quoteId = quotes[i]['tokenQuote']['symbol'];
            const quote = this.safeCurrencyCode (quoteId);
            const base = this.safeCurrencyCode (baseId);
            const symbol = baseId + '/' + quoteId;
            result.push ({
                'symbol': symbol,
                'precision': { 'cost': quotes[i]['tokenBase']['decimalPlaces'] },
                'base': base,
                'quote': quote,
                'baseId': base.toLowerCase (),
                'quoteId': quote.toLowerCase (),
                'limits': limits,
                'id': quotes[i]['slug'],
                'info': quotes[i],
                'tierBased': false,
                'active': true,
            });
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        console.log (ticker);
        console.log (market);
        let symbol = undefined;
        if (market) {
            symbol = market['symbol'];
        }
        const baseVolume = this.safeFloat (ticker, 'totalVolume');
        const quoteVolume = this.safeFloat (ticker, 'totalVolumeQuote');
        const baseDecimals = ticker['tokenBase']['decimalPlaces'];
        const quoteDecimals = ticker['tokenQuote']['decimalPlaces'];
        const priceLastNum = ticker['priceLastNumerator'];
        const priceLastDenum = ticker['priceLastDenominator'];
        const priceHighNum = ticker['priceHighNumerator'];
        const priceHighDenum = ticker['priceHighDenominator'];
        const priceLowNum = ticker['priceLowNumerator'];
        const priceLowDenum = ticker['priceLowDenominator'];
        let priceLast = 0;
        if (priceLastNum !== 0) {
            priceLast = this.getPrice (quoteDecimals, baseDecimals, priceLastNum, priceLastDenum);
        }
        let priceHigh = 0;
        if (priceLastNum !== 0) {
            priceHigh = this.getPrice (quoteDecimals, baseDecimals, priceHighNum, priceHighDenum);
        }
        let priceLow = 0;
        if (priceLastNum !== 0) {
            priceLow = this.getPrice (quoteDecimals, baseDecimals, priceLowNum, priceLowDenum);
        }
        const last = priceLast;
        let amountInUnits = this.toBaseUnitAmount (1, baseDecimals);
        const estimatedPriceRequest = {
            'tm_access_key': this.apiKey,
            'exchange': 'ethereum',
            'tokenPair': market['id'],
            'amount': amountInUnits,
            'direction': 'sell',
        };
        const lastAskResponse = this.publicGetEstimateMarketOrder (estimatedPriceRequest);
        estimatedPriceRequest['direction'] = 'buy';
        amountInUnits = this.toBaseUnitAmount (1, quoteDecimals);
        estimatedPriceRequest['amount'] = amountInUnits;
        const lastAskPrice = this.toUnitAmount (this.safeFloat (lastAskResponse['estimatedPrice'], 'approx'), quoteDecimals);
        const lastBidResponse = this.publicGetEstimateMarketOrder (estimatedPriceRequest);
        const lastBidPrice = this.toUnitAmount (this.safeFloat (lastBidResponse['estimatedPrice'], 'approx'), quoteDecimals);
        return {
            'symbol': symbol,
            'timestamp': undefined,
            'datetime': undefined,
            'high': priceHigh,
            'low': priceLow,
            'bid': lastBidPrice,
            'bidVolume': undefined,
            'ask': lastAskPrice,
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': quoteVolume,
            'quoteVolume': baseVolume,
            'info': ticker,
        };
    }

    async fetchOHLCV (symbol, timeframe = '1h', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        // let market = this.market (symbol);
        //
        //  const request = {
        //     'time_range': interval,
        // };
        //
        if (since === undefined) {
            since = '';
        }
        const market = this.market (symbol);
        const id = market['id'];
        const parameters = {
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
            'interval': timeframe,
            'since': since,
            'pair': id,
        };
        const response = await this.publicGetOhlcv (this.extend (parameters, params));
        return response['ohlcv'];
        // const response = await this.publicGetInfo (this.extend (parameters, params));
        // const tokenpairs = response['tokenPairs'];
        // let result = {};
        // for (let i = 0; i < tokenpairs.length; i++) {
        //     // console.log (tokenpairs[i]['tokenBase']['symbol']);
        //     // console.log (ids[0]);
        //     if (tokenpairs[i]['tokenBase']['symbol'] === ids[0]) {
        //         result = tokenpairs[i];
        //     }
        // }
        // // console.log (result);
        // const baseVolume = this.safeFloat (result, 'totalVolume');
        // const baseDecimals = result['tokenBase']['decimalPlaces'];
        // const quoteDecimals = result['tokenQuote']['decimalPlaces'];
        // const priceLastNum = result['priceLastNumerator'];
        // const priceLastDenum = result['priceLastDenominator'];
        // const priceHighNum = result['priceHighNumerator'];
        // const priceHighDenum = result['priceHighDenominator'];
        // const priceLowNum = result['priceLowNumerator'];
        // const priceLowDenum = result['priceLowDenominator'];
        // let priceLast = 0;
        // if (priceLastNum !== 0) {
        //     priceLast = this.getPrice (quoteDecimals, baseDecimals, priceLastNum, priceLastDenum);
        // }
        // let priceHigh = 0;
        // if (priceLastNum !== 0) {
        //     priceHigh = this.getPrice (quoteDecimals, baseDecimals, priceHighNum, priceHighDenum);
        // }
        // let priceLow = 0;
        // if (priceLastNum !== 0) {
        //     priceLow = this.getPrice (quoteDecimals, baseDecimals, priceLowNum, priceLowDenum);
        // }
        // // const ohlcvElement = {
        // //     'date': this.milliseconds (), // utc timestamp millis
        // //     'open': priceLast, // open price float
        // //     'high': priceHigh, // highest float
        // //     'low': priceLow, // lowest float
        // //     'close': priceLast, // closing
        // //     'volume': baseVolume, // volume
        // // };
        // const ohlcvElement1 = [
        //     this.milliseconds (), // utc timestamp millis
        //     priceLast, // open price float
        //     priceHigh, // highest float
        //     priceLow, // lowest float
        //     priceLast, // closing
        //     baseVolume, // volume
        // ];
        // const ohlcvElement2 = [
        //     this.milliseconds (), // utc timestamp millis
        //     priceLast, // open price float
        //     priceHigh, // highest float
        //     priceLow, // lowest float
        //     priceLast, // closing
        //     baseVolume, // volume
        // ];
        // const ohlcv = [ohlcvElement1, ohlcvElement2];
        // console.log (ohlcv);
        // return ohlcv;
    }

    async fetchTickers (symbols = undefined, params = {}) {
        const parameters = {
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
        };
        await this.loadMarkets (parameters);
        const response = await this.publicGetInfo (this.extend (parameters, params));
        const tokenpairs = response['tokenPairs'];
        const result = {};
        for (let i = 0; i < tokenpairs.length; i++) {
            const id = tokenpairs[i]['slug'];
            // const quoteId = tokenpairs[i]['tokenQuote']['slug'];
            let symbol = undefined;
            let market = undefined;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            } else {
                // const [quoteId, baseId] = id.split ('_');
                const baseId = tokenpairs[i]['tokenBase']['symbol'];
                const quoteId = tokenpairs[i]['tokenQuote']['symbol'];
                const symbol = baseId + '/' + quoteId;
                market = { 'symbol': symbol };
            }
            const ticker = tokenpairs[i];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
        };
        const response = await this.publicGetInfo (this.extend (request, params));
        let ticker = undefined;
        const ids = symbol.split ('/');
        for (let i = 0; i < response['tokenPairs'].length; i++) {
            console.log (response['tokenPairs'].length);
            if (response['tokenPairs'][i]['name'] === ids[0]) {
                ticker = response['tokenPairs'][i];
            }
        }
        if (ticker === undefined) {
            throw new ExchangeError ('No tickers for symbol:' + market['symbol']);
        }
        return this.parseTicker (ticker, market);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const id = market['id'];
        const request = {
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
            'tokenPair': id,
        };
        const response = await this.publicGetOrderBook (this.extend (request, params));
        console.log (response);
        return this.parseOrderBook (response, undefined, 'bids', 'asks', 'price', 'amount');
    }

    parseBidAsk (bidAsk, priceKey = 0, amountKey = 1) {
        const priceStruct = bidAsk[priceKey];
        const price = parseFloat (priceStruct['denominator']) / parseFloat (priceStruct['numerator']);
        const amount = parseFloat (bidAsk[amountKey]['total']);
        // const price = this.safeFloat (bidAsk, priceKey);
        // const amount = this.safeFloat (bidAsk, amountKey);
        const info = bidAsk;
        return [price, amount, info];
    }

    async fetchBalance (params = {}) {
        const request = {
            'address': this.walletAddress,
            'tm_access_key': this.apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange': 'ethereum', // ethereum
        };
        const response = await this.publicGetInfo (this.extend (request, params));
        const result = {
            'info': response['user']['accounts'],
        };
        // const keys = Object.keys (response);
        const addresses = response['user']['accounts'];
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const tokenBalances = address['tokenBalances'];
            for (let j = 0; j < tokenBalances.length; j++) {
                const currency = tokenBalances[j];
                const decimals = currency['token']['decimalPlaces'];
                const code = this.safeCurrencyCode (currency['token']['symbol']);
                const freeBase = this.safeInteger (currency, 'confirmed');
                const usedBase = this.safeInteger (currency, 'locked');
                const free = this.toUnitAmount (freeBase, decimals);
                const used = this.toUnitAmount (usedBase, decimals);
                const total = free + used;
                result[code] = {
                    'free': free,
                    'used': used,
                    'total': total,
                };
            }
        }
        return this.parseBalance (result);
    }

    getFloatFromDecimals (amount, decimals) {
        return amount / Math.pow (10, decimals);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        this.checkRequiredDependencies ();
        await this.loadMarkets ();
        const market = this.market (symbol);
        const expires = '340282366920938463463374607431768211455';
        const nonce = await this.getNonce ();
        let sideInt = undefined;
        const baseDecimals = market['info']['tokenBase']['decimalPlaces'];
        const quoteDecimals = market['info']['tokenQuote']['decimalPlaces'];
        const amountBase = this.toBaseUnitAmount (amount, baseDecimals);
        const maxDenum = market['info']['priceHighDenominator'];
        const numerator = this.getPriceNumerator (quoteDecimals, baseDecimals, maxDenum, price);
        if (side === 'buy') {
            sideInt = 0;
            // numerator = this.getPriceNumerator (baseDecimals, quoteDecimals, maxDenum, price);
        } else if (side === 'sell') {
            sideInt = 1;
        }
        const tokenAddress = market['info']['tokenBase']['address'];
        if (type === 'limit') {
            const requestToHash = {
                'exchange': this.web3.utils.toChecksumAddress ('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction': sideInt,
                'address': this.web3.utils.toChecksumAddress (this.walletAddress),
                'tokenBaseAddress': this.web3.utils.toChecksumAddress (tokenAddress),
                'tokenQuoteAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': maxDenum,
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'nonce': nonce,
            };
            const data = await this.getPayRueDexOrderHash (requestToHash);
            console.log (data);
            const signature = this.signPayrueMessage (data, this.privateKey);
            console.log (signature);
            const request = {
                'type': 'limit',
                'direction': side,
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': maxDenum,
                'tokenBaseAddress': this.web3.utils.toChecksumAddress ('0xfca47962d45adfdfd1ab2d972315db4ce7ccf094'),
                'tokenQuoteAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'nonce': nonce,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'exchange': 'ethereum',
                'makerAddress': this.walletAddress,
                'signature': signature,
            };
            const response = await this.privatePostSubmitOrder (request); // this.extend (request, params) will cause invalid signature
            return this.parseOrder (response['order'], market);
        } else if (type === 'market') {
            const estimatedPriceRequest = {
                'tm_access_key': this.apiKey,
                'exchange': 'ethereum',
                'tokenPair': market['id'],
                'amount': amountBase,
                'direction': side,
            };
            const estimatedAmountResponse = await this.publicGetEstimateMarketOrder (estimatedPriceRequest);
            const numerator = this.safeInteger (estimatedAmountResponse['estimatedPrice'], 'numerator');
            if (numerator === 0) {
                throw new ExchangeError (market['symbol'] + ' market price is 0');
            }
            const denominator = this.safeInteger (estimatedAmountResponse['estimatedPrice'], 'denominator');
            const requestToHash = {
                'exchange': this.web3.utils.toChecksumAddress ('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction': sideInt,
                'address': this.web3.utils.toChecksumAddress (this.walletAddress),
                'tokenBaseAddress': this.web3.utils.toChecksumAddress (tokenAddress),
                'tokenQuoteAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress': this.web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'amount': amountBase,
                'priceNumerator': numerator,
                'priceDenominator': denominator,
                'feeNumerator': 25,
                'feeDenominator': 10000,
                'expirationTimestamp': '340282366920938463463374607431768211455',
                'nonce': nonce,
            };
            console.log (requestToHash);
            const data = await this.getPayRueDexOrderHash (requestToHash);
            console.log (data);
            const signature = this.signPayrueMessage (data, this.privateKey);
            console.log (signature);
            const request = {
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
                'makerAddress': this.walletAddress,
                'signature': signature,
            };
            const response = await this.privatePostSubmitOrder (request);
            return this.parseOrder (response['order'], market);
        }
    }

    asyncSigning (types, values) {
        const hash = this.ethAbi.soliditySha3 (types, values);
        const orderHashString = this.web3.utils.toHex (hash);
        console.log (orderHashString);
        return this.signMessage (orderHashString, this.privateKey);
    }

    async getNonce () {
        return this.milliseconds ();
    }

    async getContractAddress () {
        return this.getContractAddress ();
    }

    async getNumDenum (amount) {
        let priceNum = undefined;
        let priceDenum = undefined;
        if (parseFloat (amount) === parseInt (amount)) {
            priceNum = amount;
            priceDenum = 1;
        } else {
            const length = (amount + '').length - 2;
            priceDenum = Math.pow (10, length);
            priceNum = amount * priceDenum;
            const divisor = this.getGcd (priceNum, priceDenum);
            priceNum /= divisor;
            priceDenum /= divisor;
        }
        const values = [];
        values.push ({
            'num': priceNum,
            'denum': priceDenum,
        });
        return values;
    }

    async getAmount (num, denum) {
        return num / denum;
    }

    getGcd (a, b) {
        if (b < 0.0000001) {
            return a;
        }
        return this.getGcd (b, Math.floor (a % b));
    }

    toBaseUnitAmount (amount, decimals) {
        // this is copied from 0xproject, MIT license
        const unit = Math.pow (10, decimals);
        return parseInt (amount * unit);
    }

    toUnitAmount (amount, decimals) {
        // this is copied from 0xproject, MIT license
        const aUnit = Math.pow (10, decimals);
        return (amount / aUnit);
    }

    getPriceNumerator (quoteDecimals, baseDecimals, maxDenominator, price) {
        const decimalsDifference = quoteDecimals - baseDecimals;
        const decimalAdjustment = Math.pow (10, decimalsDifference);
        return parseInt (price * maxDenominator * decimalAdjustment);
    }

    getPrice (quoteDecimals, baseDecimals, numerator, denominator) {
        const decimalsDifference = quoteDecimals - baseDecimals;
        const decimalAdjustment = Math.pow (10, decimalsDifference);
        return numerator / denominator / decimalAdjustment;
    }

    getTestSign () {
        const sign = this.getPayRueDEXNewOrderHashv3 ();
        const orderHashString = this.web3.utils.toHex (sign);
        const message = this.signMessage (orderHashString, this.privateKey);
        console.log (sign);
        console.log (orderHashString);
        console.log (message);
        const s = this.asyncSigning ([
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
        ]);
        console.log (s);
    }

    async cancelOrder (orderId, symbol = undefined, params = {}) {
        const request = {
            'exchange': 'ethereum',
            'uuid': orderId,
        };
        const response = await this.privatePostCancelOrder (this.extend (request));
        // { success: 1 }
        if ('success' in response) {
            return {
                'info': response,
            };
        } else {
            throw new ExchangeError (this.id + ' cancel order failed ' + this.json (response));
        }
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            'tm_access_key': this.apiKey,
            'exchange': 'ethereum',
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['market'] = market['id'];
        }
        const response = await this.publicGetInfo (this.extend (request, params));
        const orders = response['user']['orders'];
        const openOrders = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['state'] === 'fillable') {
                openOrders.push (orders[i]);
            }
        }
        return this.parseOrders (openOrders, market, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
        }
        const request = {
            'tm_access_key': this.apiKey,
            'exchange': 'ethereum',
        };
        const response = await this.publicGetInfo (this.extend (request, params));
        const allOrders = response['user']['orders'];
        let order = undefined;
        for (let i = 0; i < allOrders.length; i++) {
            if (allOrders[i]['uuid'] === id) {
                order = allOrders[i];
            }
        }
        return this.parseOrder (order, market);
    }

    parseOrder (order, market = undefined) {
        const timestamp = this.safeTimestamp (order, 'createdAt');
        const side = this.safeString (order, 'direction');
        const id = this.safeString (order, 'uuid');
        const symbol = order['tokenBase']['symbol'] + '/' + order['tokenQuote']['symbol'];
        const type = this.safeString (order, 'type');
        const numerator = order['price']['numerator'];
        const denominator = order['price']['denominator'];
        const quoteDecimals = order['tokenQuote']['decimalPlaces'];
        const baseDecimals = order['tokenBase']['decimalPlaces'];
        const price = this.getPrice (quoteDecimals, baseDecimals, parseInt (numerator), parseInt (denominator));
        const amountBase = this.safeInteger (order['amount'], 'total');
        const amount = this.toUnitAmount (amountBase, baseDecimals);
        const filledBase = this.safeInteger (order['amount'], 'filled');
        const filled = this.toUnitAmount (filledBase, baseDecimals);
        const remaining = amount - filled;
        const cost = filled * price;
        return {
            'info': order,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'side': side,
            'amount': amount,
            'price': price,
            'type': type,
            'filled': filled,
            'remaining': remaining,
            'cost': cost,
            'status': 'open',
        };
    }

    parseOrderStatus (status) {
        const statuses = {
            'open': 'open',
        };
        return this.safeString (statuses, status, status);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (this.walletAddress === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOpenOrders requires a walletAddress');
        }
        if (this.apiKey === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOpenOrders requires a apiKey');
        }
        await this.loadMarkets ();
        const request = {
            'address': this.walletAddress,
            'tm_access_key': this.apiKey,
            'exchange': 'ethereum',
        };
        const market = undefined;
        // if (limit !== undefined) {
        //     request['start'] = parseInt (Math.floor (limit));
        // }
        const response = await this.publicGetInfo (this.extend (request, params));
        const allOrders = response['user']['orders'];
        const trades = [];
        for (let i = 0; i < allOrders.length; i++) {
            if (allOrders[i]['state'] === 'fully_filled') {
                trades.push (allOrders[i]);
            }
        }
        if (Array.isArray (trades)) {
            if (symbol !== undefined) {
                const matchedOrders = [];
                for (let i = 0; i < trades.length; i++) {
                    const orderSymbol = trades[i]['tokenBase']['symbol'] + '/' + trades[i]['tokenQuote']['symbol'];
                    if (orderSymbol === symbol) {
                        matchedOrders.push (trades[i]);
                    }
                    return this.parseTrades (matchedOrders, market, since, limit);
                }
            }
            return this.parseTrades (trades, market, since, limit);
        } else {
            let result = [];
            const marketIds = Object.keys (response);
            for (let i = 0; i < marketIds.length; i++) {
                const marketId = marketIds[i];
                const trades = response[marketId];
                const parsed = this.parseTrades (trades, market, since, limit);
                result = this.arrayConcat (result, parsed);
            }
            return result;
        }
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'tokenPair': market['id'],
            'exchange': 'ethereum',
            'tm_access_key': this.apiKey,
        };
        if (limit !== undefined) {
            request['start'] = parseInt (Math.floor (limit));
        }
        const response = await this.publicGetTradeHistory (this.extend (request, params));
        return this.parseTrades (response['history'], market, since, limit);
    }

    parseTrade (trade, market = undefined) {
        // console.log (trade);
        const timestamp = this.safeTimestamp (trade, 'createdAt');
        const side = this.safeString (trade, 'direction');
        const id = this.safeString (trade, 'uuid');
        const symbol = trade['tokenBase']['symbol'] + '/' + trade['tokenQuote']['symbol'];
        const type = this.safeString (trade, 'type');
        const numerator = trade['price']['numerator'];
        const denominator = trade['price']['denominator'];
        const quoteDecimals = trade['tokenQuote']['decimalPlaces'];
        const baseDecimals = trade['tokenBase']['decimalPlaces'];
        const price = this.getPrice (quoteDecimals, baseDecimals, parseInt (numerator), parseInt (denominator));
        // const price = parseFloat (trade['price']['numerator']) / parseFloat (trade['price']['denominator']);
        const amountBase = this.safeInteger (trade['amount'], 'total');
        const amount = this.toUnitAmount (amountBase, baseDecimals);
        // const amount = this.safeInteger (trade['amount'], 'total');
        const cost = amount * price;
        let takerOrMaker = undefined;
        if (side === 'buy') {
            takerOrMaker = 'taker';
        } else {
            takerOrMaker = 'maker';
        }
        return {
            'info': trade,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'side': side,
            'amount': amount,
            'price': price,
            'type': type,
            'cost': cost,
            'status': 'closed',
            'takerOrMaker': takerOrMaker,
        };
    }

    async deposit (code, amount, txHash, params = {}) {
        this.checkRequiredDependencies ();
        this.checkAddress (this.walletAddress);
        await this.loadMarkets ();
        const currency = this.currency (code);
        const symbol = currency['code'] + '/' + 'ETH';
        const market = this.market (symbol);
        const tokenAddress = market['info']['tokenBase']['address'];
        const decimals = market['info']['tokenBase']['decimalPlaces'];
        const parsedAmount = this.toBaseUnitAmount (amount, decimals);
        const request = {
            'address': this.walletAddress,
            'tokenAddress': tokenAddress,
            'amount': parsedAmount,
            'fee': 0,
            'txHash': txHash,
            'exchange': 'ethereum',
        };
        const response = await this.privatePostDeposit (this.extend (request, params));
        return {
            'info': response,
            'id': undefined,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkRequiredDependencies ();
        this.checkAddress (address);
        await this.loadMarkets ();
        const currency = this.currency (code);
        const symbol = currency['code'] + '/' + 'ETH';
        const market = this.market (symbol);
        const tokenAddress = market['info']['tokenBase']['address'];
        const decimals = market['info']['tokenBase']['decimalPlaces'];
        const nonce = await this.getNonce ();
        const parsedAmount = this.toBaseUnitAmount (amount, decimals);
        // amount = this.toWei (amount, 'ether', currency['precision']);
        const requestToHash = {
            'contractAddress': '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            'tokenAddress': tokenAddress,
            'amount': parsedAmount,
            'address': address,
            'fee': 0,
            'nonce': nonce,
        };
        const hash = this.getPayRueDEXWithdrawHash (requestToHash);
        console.log (hash);
        const signature = this.signMessage (hash, this.privateKey);
        console.log (signature);
        const parsedSignature = signature; // ? need to parse sign to vrs
        const request = {
            'address': address,
            'amount': parsedAmount,
            'tokenAddress': tokenAddress,
            'nonce': nonce,
            'fee': 0,
            'exchange': 'ethereum',
            'signature': parsedSignature,
        };
        const response = await this.privatePostWithdraw (this.extend (request, params));
        return {
            'info': response,
            'id': undefined,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'] + '/' + path;
        if (method === 'POST') {
            body = this.json (params);
            headers = {
                'Content-Type': 'application/json',
            };
            url += '?tm_access_key=' + this.apiKey;
        } else {
            if (Object.keys (params).length) {
                url += '?' + this.urlencode (params);
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    getPayRueDEXWithdrawHash (request) {
        return this.soliditySha3 ([
            '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            request['tokenAddress'],
            request['address'],
            request['amount'],
            request['fee'],
            request['nonce'],
        ]);
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return;
        }
        if ('error' in response) {
            if (response['error'] in this.exceptions) {
                throw new this.exceptions[response['error']] (this.id + ' ' + response['error']);
            }
            throw new ExchangeError (this.id + ' ' + body);
        }
    }
};
