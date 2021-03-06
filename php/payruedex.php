<?php

namespace ccxt;

// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

use Exception; // a common import
use \ccxt\ExchangeError;
use \ccxt\ArgumentsRequired;

class payruedex extends Exchange {

    public function describe () {
        return array_replace_recursive(parent::describe (), array(
            'id' => 'payruedex',
            'name' => 'payruedex',
            'countries' => ['US'],
            'rateLimit' => 1500,
            'certified' => false,
            'requiresWeb3' => true,
            'requiresEthAbi' => true,
            'has' => array(
                'fetchOrderBook' => true,
                'fetchTicker' => true,
                'fetchTickers' => true,
                'fetchMarkets' => true,
                'fetchBalance' => true,
                'createOrder' => true,
                'fetchOHLCV' => true,
                'cancelOrder' => true,
                'fetchOpenOrders' => true,
                'fetchTrades' => false,
                'fetchMyTrades' => true,
                'withdraw' => true,
                'fetchTradingFees' => false,
            ),
            'timeframes' => array(
                '1m' => '1m',
                '3m' => '3m',
                '5m' => '5m',
                '15m' => '15m',
                '30m' => '30m', // default
                '1h' => '1h',
                '4h' => '4h',
                '1d' => '1d',
                '1w' => '1w',
                '1M' => '1M',
            ),
            'urls' => array(
                'test' => 'https://exchange.payrue.com',
                'logo' => 'https://payrue.com/assets/img/svg/new/logo.svg',
                'api' => 'https://exchange.payrue.com/trade/api/v2',
                'www' => 'https://exchange.payrue.com',
                'doc' => array(
                    'https://exchange.payrue.com',
                ),
            ),
            'api' => array(
                'public' => array(
                    'get' => array(
                        'info',
                        'order_book',
                        'price_history',
                        'trade_history',
                        'estimate_market_order',
                        'rates',
                        'ohlcv',
                    ),
                ),
                'private' => array(
                    'post' => array(
                        'submit_order',
                        'cancel_order',
                        'deposit',
                        'withdraw',
                        'register_address',
                    ),
                ),
            ),
            'options' => array(
                'contractAddress' => '0x205b2af20A899ED61788300C5b268c512D6b1CCE',  // 0x205b2af20A899ED61788300C5b268c512D6b1CCE
                'orderNonce' => null,
                'exchange' => 'ethereum',
                'ten' => 10,
            ),
            'exceptions' => array(
                'Invalid order signature. Please try again.' => '\\ccxt\\AuthenticationError',
                'You have insufficient funds to match this order. If you believe this is a mistake please refresh and try again.' => '\\ccxt\\InsufficientFunds',
                'Order no longer available.' => '\\ccxt\\InvalidOrder',
            ),
            'requiredCredentials' => array(
                'walletAddress' => true,
                'privateKey' => true,
                'apiKey' => true,
                'secret' => false,
            ),
            'commonCurrencies' => array(
                'dent' => 'DENT',
                'dai' => 'Dai Stablecoin',
            ),
        ));
    }

    public function fetch_markets ($params = array ()) {
        // idex does not have an endpoint for $markets
        // instead we generate the $markets from the endpoint for $currencies
        $request = array(
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
        );
        $markets = $this->publicGetInfo ($request);
        $currenciesById = array();
        $currencies = $markets['tokenPairs'];
        for ($i = 0; $i < count($currencies); $i++) {
            $currency = $currencies[$i];
            $currenciesById[$currency['slug']] = $currency;
        }
        $result = array();
        $limits = array(
            'amount' => array(
                'min' => null,
                'max' => null,
            ),
            'price' => array(
                'min' => null,
                'max' => null,
            ),
            'cost' => array(
                'min' => null,
                'max' => null,
            ),
        );
        $quotes = $markets['tokenPairs'];
        // $keys = is_array($quotes) ? array_keys($quotes) : array();
        for ($i = 0; $i < count($quotes); $i++) {
            $baseId = $quotes[$i]['tokenBase']['symbol'];
            $quoteId = $quotes[$i]['tokenQuote']['symbol'];
            $quote = $this->safe_currency_code($quoteId);
            $base = $this->safe_currency_code($baseId);
            $symbol = $baseId . '/' . $quoteId;
            $result[] = array(
                'symbol' => $symbol,
                'precision' => array( 'cost' => $quotes[$i]['tokenBase']['decimalPlaces'] ),
                'base' => $base,
                'quote' => $quote,
                'baseId' => strtolower($base),
                'quoteId' => strtolower($quote),
                'limits' => $limits,
                'id' => $quotes[$i]['slug'],
                'info' => $quotes[$i],
                'tierBased' => false,
                'active' => true,
            );
        }
        return $result;
    }

    public function parse_ticker ($ticker, $market = null) {
        var_dump ($ticker);
        var_dump ($market);
        $symbol = null;
        if ($market) {
            $symbol = $market['symbol'];
        }
        $baseVolume = $this->safe_float($ticker, 'totalVolume');
        $quoteVolume = $this->safe_float($ticker, 'totalVolumeQuote');
        $baseDecimals = $ticker['tokenBase']['decimalPlaces'];
        $quoteDecimals = $ticker['tokenQuote']['decimalPlaces'];
        $priceLastNum = $ticker['priceLastNumerator'];
        $priceLastDenum = $ticker['priceLastDenominator'];
        $priceHighNum = $ticker['priceHighNumerator'];
        $priceHighDenum = $ticker['priceHighDenominator'];
        $priceLowNum = $ticker['priceLowNumerator'];
        $priceLowDenum = $ticker['priceLowDenominator'];
        $priceLast = 0;
        if ($priceLastNum !== 0) {
            $priceLast = $this->get_price ($quoteDecimals, $baseDecimals, $priceLastNum, $priceLastDenum);
        }
        $priceHigh = 0;
        if ($priceLastNum !== 0) {
            $priceHigh = $this->get_price ($quoteDecimals, $baseDecimals, $priceHighNum, $priceHighDenum);
        }
        $priceLow = 0;
        if ($priceLastNum !== 0) {
            $priceLow = $this->get_price ($quoteDecimals, $baseDecimals, $priceLowNum, $priceLowDenum);
        }
        $last = $priceLast;
        $amountInUnits = $this->to_base_unit_amount (1, $baseDecimals);
        $estimatedPriceRequest = array(
            'tm_access_key' => $this->apiKey,
            'exchange' => 'ethereum',
            'tokenPair' => $market['id'],
            'amount' => $amountInUnits,
            'direction' => 'sell',
        );
        $lastAskResponse = $this->publicGetEstimateMarketOrder ($estimatedPriceRequest);
        $estimatedPriceRequest['direction'] = 'buy';
        $amountInUnits = $this->to_base_unit_amount (1, $quoteDecimals);
        $estimatedPriceRequest['amount'] = $amountInUnits;
        $lastAskPrice = $this->to_unit_amount ($this->safe_float($lastAskResponse['estimatedPrice'], 'approx'), $quoteDecimals);
        $lastBidResponse = $this->publicGetEstimateMarketOrder ($estimatedPriceRequest);
        $lastBidPrice = $this->to_unit_amount ($this->safe_float($lastBidResponse['estimatedPrice'], 'approx'), $quoteDecimals);
        return array(
            'symbol' => $symbol,
            'timestamp' => null,
            'datetime' => null,
            'high' => $priceHigh,
            'low' => $priceLow,
            'bid' => $lastBidPrice,
            'bidVolume' => null,
            'ask' => $lastAskPrice,
            'askVolume' => null,
            'vwap' => null,
            'open' => null,
            'close' => $last,
            'last' => $last,
            'previousClose' => null,
            'change' => null,
            'percentage' => null,
            'average' => null,
            'baseVolume' => $quoteVolume,
            'quoteVolume' => $baseVolume,
            'info' => $ticker,
        );
    }

    public function fetch_ohlcv ($symbol, $timeframe = '1h', $since = null, $limit = null, $params = array ()) {
        $this->load_markets();
        // $market = $this->market ($symbol);
        //
        //  $request = array(
        //     'time_range' => interval,
        // );
        //
        if ($since === null) {
            $since = '';
        }
        $market = $this->market ($symbol);
        $id = $market['id'];
        $parameters = array(
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
            'interval' => $timeframe,
            'since' => $since,
            'pair' => $id,
        );
        $response = $this->publicGetOhlcv (array_merge($parameters, $params));
        return $response['ohlcv'];
        // $response = $this->publicGetInfo (array_merge($parameters, $params));
        // $tokenpairs = $response['tokenPairs'];
        // $result = array();
        // for ($i = 0; $i < count($tokenpairs); $i++) {
        //     // var_dump ($tokenpairs[$i]['tokenBase']['symbol']);
        //     // var_dump (ids[0]);
        //     if ($tokenpairs[$i]['tokenBase']['symbol'] === ids[0]) {
        //         $result = $tokenpairs[$i];
        //     }
        // }
        // // var_dump ($result);
        // $baseVolume = $this->safe_float($result, 'totalVolume');
        // $baseDecimals = $result['tokenBase']['decimalPlaces'];
        // $quoteDecimals = $result['tokenQuote']['decimalPlaces'];
        // $priceLastNum = $result['priceLastNumerator'];
        // $priceLastDenum = $result['priceLastDenominator'];
        // $priceHighNum = $result['priceHighNumerator'];
        // $priceHighDenum = $result['priceHighDenominator'];
        // $priceLowNum = $result['priceLowNumerator'];
        // $priceLowDenum = $result['priceLowDenominator'];
        // $priceLast = 0;
        // if ($priceLastNum !== 0) {
        //     $priceLast = $this->get_price ($quoteDecimals, $baseDecimals, $priceLastNum, $priceLastDenum);
        // }
        // $priceHigh = 0;
        // if ($priceLastNum !== 0) {
        //     $priceHigh = $this->get_price ($quoteDecimals, $baseDecimals, $priceHighNum, $priceHighDenum);
        // }
        // $priceLow = 0;
        // if ($priceLastNum !== 0) {
        //     $priceLow = $this->get_price ($quoteDecimals, $baseDecimals, $priceLowNum, $priceLowDenum);
        // }
        // // $ohlcvElement = array(
        // //     'date' => $this->milliseconds (), // utc timestamp millis
        // //     'open' => $priceLast, // open price float
        // //     'high' => $priceHigh, // highest float
        // //     'low' => $priceLow, // lowest float
        // //     'close' => $priceLast, // closing
        // //     'volume' => $baseVolume, // volume
        // // );
        // $ohlcvElement1 = array(
        //     $this->milliseconds (), // utc timestamp millis
        //     $priceLast, // open price float
        //     $priceHigh, // highest float
        //     $priceLow, // lowest float
        //     $priceLast, // closing
        //     $baseVolume, // volume
        // );
        // $ohlcvElement2 = array(
        //     $this->milliseconds (), // utc timestamp millis
        //     $priceLast, // open price float
        //     $priceHigh, // highest float
        //     $priceLow, // lowest float
        //     $priceLast, // closing
        //     $baseVolume, // volume
        // );
        // $ohlcv = [$ohlcvElement1, $ohlcvElement2];
        // var_dump ($ohlcv);
        // return $ohlcv;
    }

    public function fetch_tickers ($symbols = null, $params = array ()) {
        $parameters = array(
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
        );
        $this->load_markets($parameters);
        $response = $this->publicGetInfo (array_merge($parameters, $params));
        $tokenpairs = $response['tokenPairs'];
        $result = array();
        for ($i = 0; $i < count($tokenpairs); $i++) {
            $id = $tokenpairs[$i]['slug'];
            // $quoteId = $tokenpairs[$i]['tokenQuote']['slug'];
            $symbol = null;
            $market = null;
            if (is_array($this->markets_by_id) && array_key_exists($id, $this->markets_by_id)) {
                $market = $this->markets_by_id[$id];
                $symbol = $market['symbol'];
            } else {
                // [$quoteId, $baseId] = explode('_', $id);
                $baseId = $tokenpairs[$i]['tokenBase']['symbol'];
                $quoteId = $tokenpairs[$i]['tokenQuote']['symbol'];
                $symbol = $baseId . '/' . $quoteId;
                $market = array( 'symbol' => $symbol );
            }
            $ticker = $tokenpairs[$i];
            $result[$symbol] = $this->parse_ticker($ticker, $market);
        }
        return $result;
    }

    public function fetch_ticker ($symbol, $params = array ()) {
        $this->load_markets();
        $market = $this->market ($symbol);
        $request = array(
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
        );
        $response = $this->publicGetInfo (array_merge($request, $params));
        $ticker = null;
        $ids = explode('/', $symbol);
        for ($i = 0; $i < count($response['tokenPairs']); $i++) {
            if ($response['tokenPairs'][$i]['name'] === $ids[0]) {
                $ticker = $response['tokenPairs'][$i];
            }
        }
        if ($ticker === null) {
            throw new ExchangeError('No tickers for $symbol:' . $market['symbol']);
        }
        return $this->parse_ticker($ticker, $market);
    }

    public function fetch_order_book ($symbol, $limit = null, $params = array ()) {
        $this->load_markets();
        $market = $this->market ($symbol);
        $id = $market['id'];
        $request = array(
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
            'tokenPair' => $id,
        );
        $response = $this->publicGetOrderBook (array_merge($request, $params));
        var_dump ($response);
        return $this->parse_order_book($response, null, 'bids', 'asks', 'price', 'amount');
    }

    public function parse_bid_ask ($bidAsk, $priceKey = 0, $amountKey = 1) {
        $priceStruct = $bidAsk[$priceKey];
        $price = floatval ($priceStruct['denominator']) / floatval ($priceStruct['numerator']);
        $amount = floatval ($bidAsk[$amountKey]['total']);
        // $price = $this->safe_float($bidAsk, $priceKey);
        // $amount = $this->safe_float($bidAsk, $amountKey);
        $info = $bidAsk;
        return [$price, $amount, $info];
    }

    public function fetch_balance ($params = array ()) {
        $request = array(
            'address' => $this->walletAddress,
            'tm_access_key' => $this->apiKey,  // 507d181c-69be-4a00-92ae-7fa89ccfcf27
            'exchange' => 'ethereum', // ethereum
        );
        $response = $this->publicGetInfo (array_merge($request, $params));
        $result = array(
            'info' => $response['user']['accounts'],
        );
        // $keys = is_array($response) ? array_keys($response) : array();
        $addresses = $response['user']['accounts'];
        for ($i = 0; $i < count($addresses); $i++) {
            $address = $addresses[$i];
            $tokenBalances = $address['tokenBalances'];
            for ($j = 0; $j < count($tokenBalances); $j++) {
                $currency = $tokenBalances[$j];
                $decimals = $currency['token']['decimalPlaces'];
                $code = $this->safe_currency_code($currency['token']['symbol']);
                $freeBase = $this->safe_integer($currency, 'confirmed');
                $usedBase = $this->safe_integer($currency, 'locked');
                $free = $this->to_unit_amount ($freeBase, $decimals);
                $used = $this->to_unit_amount ($usedBase, $decimals);
                $total = $free . $used;
                $result[$code] = array(
                    'free' => $free,
                    'used' => $used,
                    'total' => $total,
                );
            }
        }
        return $this->parse_balance($result);
    }

    public function get_float_from_decimals ($amount, $decimals) {
        return $amount / pow(10, $decimals);
    }

    public function create_order ($symbol, $type, $side, $amount, $price = null, $params = array ()) {
        $this->check_required_dependencies();
        $this->load_markets();
        $market = $this->market ($symbol);
        $expires = '340282366920938463463374607431768211455';
        $nonce = $this->get_nonce ();
        $sideInt = null;
        $baseDecimals = $market['info']['tokenBase']['decimalPlaces'];
        $quoteDecimals = $market['info']['tokenQuote']['decimalPlaces'];
        $amountBase = $this->to_base_unit_amount ($amount, $baseDecimals);
        $maxDenum = $market['info']['priceHighDenominator'];
        $numerator = $this->get_price_numerator ($quoteDecimals, $baseDecimals, $maxDenum, $price);
        if ($side === 'buy') {
            $sideInt = 0;
            // $numerator = $this->get_price_numerator ($baseDecimals, $quoteDecimals, $maxDenum, $price);
        } else if ($side === 'sell') {
            $sideInt = 1;
        }
        $tokenAddress = $market['info']['tokenBase']['address'];
        if ($type === 'limit') {
            $requestToHash = array(
                'exchange' => $this->web3.utils.toChecksumAddress ('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction' => $sideInt,
                'address' => $this->web3.utils.toChecksumAddress ($this->walletAddress),
                'tokenBaseAddress' => $this->web3.utils.toChecksumAddress ($tokenAddress),
                'tokenQuoteAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'amount' => $amountBase,
                'priceNumerator' => $numerator,
                'priceDenominator' => $maxDenum,
                'feeNumerator' => 25,
                'feeDenominator' => 10000,
                'expirationTimestamp' => '340282366920938463463374607431768211455',
                'nonce' => $nonce,
            );
            $data = $this->getPayRueDexOrderHash ($requestToHash);
            var_dump ($data);
            $signature = $this->signPayrueMessage ($data, $this->privateKey);
            var_dump ($signature);
            $request = array(
                'type' => 'limit',
                'direction' => $side,
                'amount' => $amountBase,
                'priceNumerator' => $numerator,
                'priceDenominator' => $maxDenum,
                'tokenBaseAddress' => $this->web3.utils.toChecksumAddress ('0xfca47962d45adfdfd1ab2d972315db4ce7ccf094'),
                'tokenQuoteAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'feeNumerator' => 25,
                'feeDenominator' => 10000,
                'nonce' => $nonce,
                'expirationTimestamp' => '340282366920938463463374607431768211455',
                'exchange' => 'ethereum',
                'makerAddress' => $this->walletAddress,
                'signature' => $signature,
            );
            $response = $this->privatePostSubmitOrder ($request); // array_merge($request, $params) will cause invalid $signature
            return $this->parse_order($response['order'], $market);
        } else if ($type === 'market') {
            $estimatedPriceRequest = array(
                'tm_access_key' => $this->apiKey,
                'exchange' => 'ethereum',
                'tokenPair' => $market['id'],
                'amount' => $amountBase,
                'direction' => $side,
            );
            $estimatedAmountResponse = $this->publicGetEstimateMarketOrder ($estimatedPriceRequest);
            $numerator = $this->safe_integer($estimatedAmountResponse['estimatedPrice'], 'numerator');
            if ($numerator === 0) {
                throw new ExchangeError($market['symbol'] . ' $market $price is 0');
            }
            $denominator = $this->safe_integer($estimatedAmountResponse['estimatedPrice'], 'denominator');
            $requestToHash = array(
                'exchange' => $this->web3.utils.toChecksumAddress ('0x205b2af20A899ED61788300C5b268c512D6b1CCE'),
                'direction' => $sideInt,
                'address' => $this->web3.utils.toChecksumAddress ($this->walletAddress),
                'tokenBaseAddress' => $this->web3.utils.toChecksumAddress ($tokenAddress),
                'tokenQuoteAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'tokenFeeAddress' => $this->web3.utils.toChecksumAddress ('0x0000000000000000000000000000000000000000'),
                'amount' => $amountBase,
                'priceNumerator' => $numerator,
                'priceDenominator' => $denominator,
                'feeNumerator' => 25,
                'feeDenominator' => 10000,
                'expirationTimestamp' => '340282366920938463463374607431768211455',
                'nonce' => $nonce,
            );
            var_dump ($requestToHash);
            $data = $this->getPayRueDexOrderHash ($requestToHash);
            var_dump ($data);
            $signature = $this->signPayrueMessage ($data, $this->privateKey);
            var_dump ($signature);
            $request = array(
                'type' => $type,
                'direction' => $side,
                'amount' => $amountBase,
                'priceNumerator' => $numerator,
                'priceDenominator' => $denominator,
                'tokenBaseAddress' => $market['info']['tokenBase']['address'],
                'tokenQuoteAddress' => $market['info']['tokenQuote']['address'],
                'tokenFeeAddress' => '0x0000000000000000000000000000000000000000',
                'feeNumerator' => 25,
                'feeDenominator' => 10000,
                'nonce' => $nonce,
                'expirationTimestamp' => $expires,
                'exchange' => 'ethereum',
                'makerAddress' => $this->walletAddress,
                'signature' => $signature,
            );
            $response = $this->privatePostSubmitOrder ($request);
            return $this->parse_order($response['order'], $market);
        }
    }

    public function async_signing ($types, $values) {
        $hash = $this->ethAbi.soliditySha3 ($types, $values);
        $orderHashString = $this->web3.utils.toHex ($hash);
        var_dump ($orderHashString);
        return $this->signMessage ($orderHashString, $this->privateKey);
    }

    public function get_nonce () {
        return $this->milliseconds ();
    }

    public function get_contract_address () {
        return $this->get_contract_address ();
    }

    public function get_num_denum ($amount) {
        $priceNum = null;
        $priceDenum = null;
        if (floatval ($amount) === intval ($amount)) {
            $priceNum = $amount;
            $priceDenum = 1;
        } else {
            $length = ($amount . strlen('')) - 2;
            $priceDenum = pow(10, $length);
            $priceNum = $amount * $priceDenum;
            $divisor = $this->get_gcd ($priceNum, $priceDenum);
            $priceNum /= $divisor;
            $priceDenum /= $divisor;
        }
        $values = array();
        $values[] = array(
            'num' => $priceNum,
            'denum' => $priceDenum,
        );
        return $values;
    }

    public function get_amount ($num, $denum) {
        return $num / $denum;
    }

    public function get_gcd ($a, $b) {
        if ($b < 0.0000001) {
            return $a;
        }
        return $this->get_gcd ($b, (int) floor(fmod($a, $b)));
    }

    public function to_base_unit_amount ($amount, $decimals) {
        // this is copied from 0xproject, MIT license
        $unit = pow(10, $decimals);
        return intval ($amount * $unit);
    }

    public function to_unit_amount ($amount, $decimals) {
        // this is copied from 0xproject, MIT license
        $aUnit = pow(10, $decimals);
        return ($amount / $aUnit);
    }

    public function get_price_numerator ($quoteDecimals, $baseDecimals, $maxDenominator, $price) {
        $decimalsDifference = $quoteDecimals - $baseDecimals;
        $decimalAdjustment = pow(10, $decimalsDifference);
        return intval ($price * $maxDenominator * $decimalAdjustment);
    }

    public function get_price ($quoteDecimals, $baseDecimals, $numerator, $denominator) {
        $decimalsDifference = $quoteDecimals - $baseDecimals;
        $decimalAdjustment = pow(10, $decimalsDifference);
        return $numerator / $denominator / $decimalAdjustment;
    }

    public function get_test_sign () {
        $sign = $this->getPayRueDEXNewOrderHashv3 ();
        $orderHashString = $this->web3.utils.toHex ($sign);
        $message = $this->signMessage ($orderHashString, $this->privateKey);
        var_dump ($sign);
        var_dump ($orderHashString);
        var_dump ($message);
        $s = $this->async_signing (array(
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
        ), array(
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
        ));
        var_dump ($s);
    }

    public function cancel_order ($orderId, $symbol = null, $params = array ()) {
        $request = array(
            'exchange' => 'ethereum',
            'uuid' => $orderId,
        );
        $response = $this->privatePostCancelOrder (array_merge($request));
        // array( success => 1 )
        if (is_array($response) && array_key_exists('success', $response)) {
            return array(
                'info' => $response,
            );
        } else {
            throw new ExchangeError($this->id . ' cancel order failed ' . $this->json ($response));
        }
    }

    public function fetch_open_orders ($symbol = null, $since = null, $limit = null, $params = array ()) {
        $this->load_markets();
        $request = array(
            'tm_access_key' => $this->apiKey,
            'exchange' => 'ethereum',
        );
        $market = null;
        if ($symbol !== null) {
            $market = $this->market ($symbol);
            $request['market'] = $market['id'];
        }
        $response = $this->publicGetInfo (array_merge($request, $params));
        $orders = $response['user']['orders'];
        $openOrders = array();
        for ($i = 0; $i < count($orders); $i++) {
            if ($orders[$i]['state'] === 'fillable') {
                $openOrders[] = $orders[$i];
            }
        }
        return $this->parse_orders($openOrders, $market, $since, $limit);
    }

    public function fetch_order ($id, $symbol = null, $params = array ()) {
        $this->load_markets();
        $market = null;
        if ($symbol !== null) {
            $market = $this->market ($symbol);
        }
        $request = array(
            'tm_access_key' => $this->apiKey,
            'exchange' => 'ethereum',
        );
        $response = $this->publicGetInfo (array_merge($request, $params));
        $allOrders = $response['user']['orders'];
        $order = null;
        for ($i = 0; $i < count($allOrders); $i++) {
            if ($allOrders[$i]['uuid'] === $id) {
                $order = $allOrders[$i];
            }
        }
        return $this->parse_order($order, $market);
    }

    public function parse_order ($order, $market = null) {
        $timestamp = $this->safe_timestamp($order, 'createdAt');
        $side = $this->safe_string($order, 'direction');
        $id = $this->safe_string($order, 'uuid');
        $symbol = $order['tokenBase']['symbol'] . '/' . $order['tokenQuote']['symbol'];
        $type = $this->safe_string($order, 'type');
        $numerator = $order['price']['numerator'];
        $denominator = $order['price']['denominator'];
        $quoteDecimals = $order['tokenQuote']['decimalPlaces'];
        $baseDecimals = $order['tokenBase']['decimalPlaces'];
        $price = $this->get_price ($quoteDecimals, $baseDecimals, intval ($numerator), intval ($denominator));
        $amountBase = $this->safe_integer($order['amount'], 'total');
        $amount = $this->to_unit_amount ($amountBase, $baseDecimals);
        $filledBase = $this->safe_integer($order['amount'], 'filled');
        $filled = $this->to_unit_amount ($filledBase, $baseDecimals);
        $remaining = $amount - $filled;
        $cost = $filled * $price;
        return array(
            'info' => $order,
            'id' => $id,
            'symbol' => $symbol,
            'timestamp' => $timestamp,
            'datetime' => $this->iso8601 ($timestamp),
            'side' => $side,
            'amount' => $amount,
            'price' => $price,
            'type' => $type,
            'filled' => $filled,
            'remaining' => $remaining,
            'cost' => $cost,
            'status' => 'open',
        );
    }

    public function parse_order_status ($status) {
        $statuses = array(
            'open' => 'open',
        );
        return $this->safe_string($statuses, $status, $status);
    }

    public function fetch_my_trades ($symbol = null, $since = null, $limit = null, $params = array ()) {
        if ($this->walletAddress === null) {
            throw new ArgumentsRequired($this->id . ' fetchOpenOrders requires a walletAddress');
        }
        if ($this->apiKey === null) {
            throw new ArgumentsRequired($this->id . ' fetchOpenOrders requires a apiKey');
        }
        $this->load_markets();
        $request = array(
            'address' => $this->walletAddress,
            'tm_access_key' => $this->apiKey,
            'exchange' => 'ethereum',
        );
        $market = null;
        // if ($limit !== null) {
        //     $request['start'] = intval ((int) floor($limit));
        // }
        $response = $this->publicGetInfo (array_merge($request, $params));
        $allOrders = $response['user']['orders'];
        $trades = array();
        for ($i = 0; $i < count($allOrders); $i++) {
            if ($allOrders[$i]['state'] === 'fully_filled') {
                $trades[] = $allOrders[$i];
            }
        }
        if (gettype($trades) === 'array' && count(array_filter(array_keys($trades), 'is_string')) == 0) {
            if ($symbol !== null) {
                $matchedOrders = array();
                for ($i = 0; $i < count($trades); $i++) {
                    $orderSymbol = $trades[$i]['tokenBase']['symbol'] . '/' . $trades[$i]['tokenQuote']['symbol'];
                    if ($orderSymbol === $symbol) {
                        $matchedOrders[] = $trades[$i];
                    }
                    return $this->parse_trades($matchedOrders, $market, $since, $limit);
                }
            }
            return $this->parse_trades($trades, $market, $since, $limit);
        } else {
            $result = array();
            $marketIds = is_array($response) ? array_keys($response) : array();
            for ($i = 0; $i < count($marketIds); $i++) {
                $marketId = $marketIds[$i];
                $trades = $response[$marketId];
                $parsed = $this->parse_trades($trades, $market, $since, $limit);
                $result = $this->array_concat($result, $parsed);
            }
            return $result;
        }
    }

    public function fetch_trades ($symbol, $since = null, $limit = null, $params = array ()) {
        $this->load_markets();
        $market = $this->market ($symbol);
        $request = array(
            'tokenPair' => $market['id'],
            'exchange' => 'ethereum',
            'tm_access_key' => $this->apiKey,
        );
        if ($limit !== null) {
            $request['start'] = intval ((int) floor($limit));
        }
        $response = $this->publicGetTradeHistory (array_merge($request, $params));
        return $this->parse_trades($response['history'], $market, $since, $limit);
    }

    public function parse_trade ($trade, $market = null) {
        // var_dump ($trade);
        $timestamp = $this->safe_timestamp($trade, 'createdAt');
        $side = $this->safe_string($trade, 'direction');
        $id = $this->safe_string($trade, 'uuid');
        $symbol = $trade['tokenBase']['symbol'] . '/' . $trade['tokenQuote']['symbol'];
        $type = $this->safe_string($trade, 'type');
        $numerator = $trade['price']['numerator'];
        $denominator = $trade['price']['denominator'];
        $quoteDecimals = $trade['tokenQuote']['decimalPlaces'];
        $baseDecimals = $trade['tokenBase']['decimalPlaces'];
        $price = $this->get_price ($quoteDecimals, $baseDecimals, intval ($numerator), intval ($denominator));
        // $price = floatval ($trade['price']['numerator']) / floatval ($trade['price']['denominator']);
        $amountBase = $this->safe_integer($trade['amount'], 'total');
        $amount = $this->to_unit_amount ($amountBase, $baseDecimals);
        // $amount = $this->safe_integer($trade['amount'], 'total');
        $cost = $amount * $price;
        $takerOrMaker = null;
        if ($side === 'buy') {
            $takerOrMaker = 'taker';
        } else {
            $takerOrMaker = 'maker';
        }
        return array(
            'info' => $trade,
            'id' => $id,
            'symbol' => $symbol,
            'timestamp' => $timestamp,
            'datetime' => $this->iso8601 ($timestamp),
            'side' => $side,
            'amount' => $amount,
            'price' => $price,
            'type' => $type,
            'cost' => $cost,
            'status' => 'closed',
            'takerOrMaker' => $takerOrMaker,
        );
    }

    public function deposit ($code, $amount, $txHash, $params = array ()) {
        $this->check_required_dependencies();
        $this->check_address($this->walletAddress);
        $this->load_markets();
        $currency = $this->currency ($code);
        $symbol = $currency['code'] . '/' . 'ETH';
        $market = $this->market ($symbol);
        $tokenAddress = $market['info']['tokenBase']['address'];
        $decimals = $market['info']['tokenBase']['decimalPlaces'];
        $parsedAmount = $this->to_base_unit_amount ($amount, $decimals);
        $request = array(
            'address' => $this->walletAddress,
            'tokenAddress' => $tokenAddress,
            'amount' => $parsedAmount,
            'fee' => 0,
            'txHash' => $txHash,
            'exchange' => 'ethereum',
        );
        $response = $this->privatePostDeposit (array_merge($request, $params));
        return array(
            'info' => $response,
            'id' => null,
        );
    }

    public function withdraw ($code, $amount, $address, $tag = null, $params = array ()) {
        $this->check_required_dependencies();
        $this->check_address($address);
        $this->load_markets();
        $currency = $this->currency ($code);
        $symbol = $currency['code'] . '/' . 'ETH';
        $market = $this->market ($symbol);
        $tokenAddress = $market['info']['tokenBase']['address'];
        $decimals = $market['info']['tokenBase']['decimalPlaces'];
        $nonce = $this->get_nonce ();
        $parsedAmount = $this->to_base_unit_amount ($amount, $decimals);
        // $amount = $this->toWei ($amount, 'ether', $currency['precision']);
        $requestToHash = array(
            'contractAddress' => '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            'tokenAddress' => $tokenAddress,
            'amount' => $parsedAmount,
            'address' => $address,
            'fee' => 0,
            'nonce' => $nonce,
        );
        $hash = $this->get_pay_rue_dex_withdraw_hash ($requestToHash);
        var_dump ($hash);
        $signature = $this->signMessage ($hash, $this->privateKey);
        var_dump ($signature);
        $parsedSignature = $signature; // ? need to parse sign to vrs
        $request = array(
            'address' => $address,
            'amount' => $parsedAmount,
            'tokenAddress' => $tokenAddress,
            'nonce' => $nonce,
            'fee' => 0,
            'exchange' => 'ethereum',
            'signature' => $parsedSignature,
        );
        $response = $this->privatePostWithdraw (array_merge($request, $params));
        return array(
            'info' => $response,
            'id' => null,
        );
    }

    public function sign ($path, $api = 'public', $method = 'GET', $params = array (), $headers = null, $body = null) {
        $url = $this->urls['api'] . '/' . $path;
        if ($method === 'POST') {
            $body = $this->json ($params);
            $headers = array(
                'Content-Type' => 'application/json',
            );
            $url .= '?tm_access_key=' . $this->apiKey;
        } else {
            if ($params) {
                $url .= '?' . $this->urlencode ($params);
            }
        }
        return array( 'url' => $url, 'method' => $method, 'body' => $body, 'headers' => $headers );
    }

    public function get_pay_rue_dex_withdraw_hash ($request) {
        return $this->soliditySha3 ([
            '0x205b2af20A899ED61788300C5b268c512D6b1CCE',
            $request['tokenAddress'],
            $request['address'],
            $request['amount'],
            $request['fee'],
            $request['nonce'],
        ]);
    }

    public function handle_errors ($code, $reason, $url, $method, $headers, $body, $response, $requestHeaders, $requestBody) {
        if ($response === null) {
            return;
        }
        if (is_array($response) && array_key_exists('error', $response)) {
            if (is_array($this->exceptions) && array_key_exists($response['error'], $this->exceptions)) {
                throw new $this->exceptions[$response['error']]($this->id . ' ' . $response['error']);
            }
            throw new ExchangeError($this->id . ' ' . $body);
        }
    }
}
