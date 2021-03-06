/**
 * TODO: tests for compatibility with other rsa libraries
 */

var fs = require('fs');
var assert = require("chai").assert;
var _ = require("lodash");
var NodeRSA = require("../src/NodeRSA");


describe("NodeRSA", function(){
    var keySizes = [
        {b: 512, e: 3},
        {b: 512, e: 5},
        {b: 512, e: 257},
        {b: 512, e: 65537},
        {b: 768}, // 'e' should be 65537
        {b: 1024} // 'e' should be 65537
    ];

    var signAlgorithms = ['md5', 'sha1', "sha256", "sha384", "sha512"];
	var schemeSigning = {
		pss: NodeRSA.RSA.PSS.Default,
		pkcs1: NodeRSA.RSA.PKCS1.Default
	};
	var schemeEncrypting = {
		oaep: NodeRSA.RSA.OAEP.Default,
		pkcs1: NodeRSA.RSA.PKCS1.Default
	};

    var dataBundle = {
        "string": {
            data: "ascii + 12345678",
            encoding: "utf8"
        },
        "unicode string": {
            data: "ascii + юникод スラ ⑨",
            encoding: "utf8"            
        },
        "empty string": {
            data: "",
            encoding: ["utf8", "ascii", "hex", "base64"]
        },
        "long string": {
            data: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
            encoding: ["utf8", "ascii"]
        },
        "buffer": {
            data: new Buffer("ascii + юникод スラ ⑨"),
            encoding: "buffer"
        },
        "json object": {
            data: {str: "string", arr: ["a","r","r", "a", "y", true, "⑨"], int: 42, nested: {key: {key: 1}}},
            encoding: "json"
        },
        "json array": {
            data: [1,2,3,4,5,6,7,8,9,[10,11,12,[13],14,15,[16,17,[18]]]],
            encoding: "json"
        }
    };

    var generatedKeys = [];
    var privateNodeRSA = null;
    var publicNodeRSA = null;

    describe("Work with keys", function(){

        describe("Generating keys", function() {
            for (var size in keySizes) {
                (function(size){
                    it("should make key pair " + size.b + "-bit length and public exponent is " + (size.e ? size.e : size.e + " and should be 65537"), function () {
                        generatedKeys.push(new NodeRSA({b: size.b, e: size.e}));
						generatedKeys[generatedKeys.length - 1].schemeEncryption = NodeRSA.RSA.PKCS1.Default;
                        assert.instanceOf(generatedKeys[generatedKeys.length - 1].keyPair, Object);
                        assert.equal(generatedKeys[generatedKeys.length - 1].isEmpty(), false);
                        assert.equal(generatedKeys[generatedKeys.length - 1].getKeySize(), size.b);
                        //assert.equal(generatedKeys[generatedKeys.length - 1].getMaxMessageSize(), (size.b / 8 - 11)); // This one depends on the scheme the key uses
                        assert.equal(generatedKeys[generatedKeys.length - 1].keyPair.e, size.e || 65537);
                    });
                })(keySizes[size]);
            }

            it("should make empty key pair", function () {
                var key = new NodeRSA(null);
                assert.equal(key.isEmpty(), true);
            });

            it.skip("should make empty key pair with md5 signing option", function () {
                var key = new NodeRSA(null, {signingAlgorithm: 'md5'});
                assert.equal(key.isEmpty(), true);
                assert.equal(key.options.signingAlgorithm, 'md5');
            });
        });

        describe("PEM", function(){
            var privateKeyPEM = "-----BEGIN RSA PRIVATE KEY-----\n"+
                "MIIFwgIBAAKCAUEAsE1edyfToZRv6cFOkB0tAJ5qJor4YF5CccJAL0fS/o1Yk10V\n"+
                "SXH4Xx4peSJgYQKkO0HqO1hAz6k9dFQB4U1CnWtRjtNEcIfycqrZrhu6you5syb6\n"+
                "ScV3Zu/9bm7/DyaLlx/gJhUPR1OxOzaqsEvlu7hbDhNLIYo1zKFb/aUBbD6+UcaG\n"+
                "xH2BfFNdzVAtVSVpc/s2Y3sboMN7rByUj7937iQlaMINvVjyasynYuzHNw6ZRP9J\n"+
                "P9fwxrCyaxnTPWxVl0qvVaQO2+TtFMtDXH2OVZtWWeLHAL8cildw0G+u2qVqTqIG\n"+
                "EwNyJlsAHykaPFAMW0xLueumrSlB+JUJPrRvvw4nBCd4GOrNSlPCE/xlk1Cb8JaI\n"+
                "CTLvDUcYc3ZqL3jqAueBhkpw2uCz8xVJeOA1KY4kQIIx8JEBsAYzgyP2iy0CAwEA\n"+
                "AQKCAUAjBcudShkdgRpWSmNr94/IDrAxpeu/YRo79QXBHriIftW4uIYRCAX6B0jf\n"+
                "2ndg7iBn8Skxzs9ZMVqW8FVLR4jTMs2J3Og8npUIOG5zyuhpciZas4SHASY+GbCz\n"+
                "rnMWtGaIh/mENyzI05RimfKAgSNLDk1wV17Wc9lKJEfc9Fl7Al/WaOS+xdviMcFx\n"+
                "ltrajksLkjz0uDD917eKskbE45lULfGqeI0kYDadWp88pw6ikXJln2p3Y1PNQF3e\n"+
                "y2cN+Snzd0jx/c5fD9B1zxKYv5bUo+UnTzBxV81e9xCJfkdXv+6D5qDn1gGLdZZa\n"+
                "5FxtZbRgVh/ZlqP9xYr72as/WFmIA20wRgHPgWvLyHsh0XThqZf2/O3R8KmFv8aT\n"+
                "+kmc5is6sVItIIi7ltorVapTkJai3zz/VSMBBaL+ytFN9jVl4QKBoQDfL8TMeZXu\n"+
                "gBTN7yq6zZWN8+60MUaxz0/lKdzmo35z32rpVKdsYd922pmcsNYaoj/H9L3j/NP4\n"+
                "9z+SHfYpWvTa7AvJfNlXYc3BRXIarpfnXsm65IzKzHaF9i2xdXxkfTEYIvOQDMLF\n"+
                "SiiObWJMV+QqUxb3luu3/CR3IcbgeTOpdiC/T/Zl/YYl17JqZTHmLFZPq7xewttg\n"+
                "zQorDRWIFDtlAoGhAMo4+uM9f4BpOHSmayhLhHArIGs4386BkXSeOLeQitaQJ/2c\n"+
                "zb459O87XoCAonZbq+dI7XRnBU3toQvEsZgrtGkOFXCZJMWAQxD5BQ5vEYT6c86h\n"+
                "uGpX6h3ODlJ6UGi+5CWyMQ1cFlBkfffFAarjSYTVlyj736sOeDuJWX133z5VQBQ8\n"+
                "1xSH23kNF95vxB4I1fXG8WL11YZU7VEwSLC4aCkCgaAKRj+wDhTZ4umSRWVZLiep\n"+
                "XkZp4y7W9q095nx13abvnKRmU3BVq/fGl++kZ/ujRD7dbKXlPflgJ7m0d06ivr4w\n"+
                "6dbtEqNKw4TeVd0X31u82f89bFIS7/Cw4BFgbwEn+x9sdgdyZTP+MxjE3cI9s3oc\n"+
                "fLC8+ySk1qWzGkn2gX3gWkDNrdexAEfRrClZfokaiIX8qvJEBoJk5WuHadXI6u2F\n"+
                "AoGgByidOQ4kRVd0OCzr/jEuLwpXy3Pn+Fd93rL7LwRe5dmUkNXMMr+6e/2OCt6C\n"+
                "4c28+CMMxOIgvfF7kf8Uil6BtHZbK/E/6/3uYdtu4mPsKtjy4I25CYqzLvrsZt8N\n"+
                "maeoS+1S7zYjVBU6oFrJBFOndpxZDYpdEKEigHkMQfTMYliCPDUrJ/7nNhHQln8+\n"+
                "YhHOATVZtjcdp/O5svYSnK7qgQKBoDd3lFWrPatgxpF1JXMEFFbaIRdNxHkKA4YY\n"+
                "gMTM4MPgViunYX/yJ7SaX8jWnC231A9uVn4+kb+DvKjc+ZuTQvnIUK2u6LvIinVF\n"+
                "snDEA+BbXwehAtwdHDMDtqYFdx4hvCWQwBNn4p3J0OO2tbYVMtvM5aOEfRSYagfm\n"+
                "RywhDUAjW8U0RBnzlmXhQQ6B9bjqooS2MsRrJrS5CU682fb3hBo=\n"+
                "-----END RSA PRIVATE KEY-----";

            var publicKeyPEM = "-----BEGIN PUBLIC KEY-----\n"+
                "MIIBYjANBgkqhkiG9w0BAQEFAAOCAU8AMIIBSgKCAUEAsE1edyfToZRv6cFOkB0t\n"+
                "AJ5qJor4YF5CccJAL0fS/o1Yk10VSXH4Xx4peSJgYQKkO0HqO1hAz6k9dFQB4U1C\n"+
                "nWtRjtNEcIfycqrZrhu6you5syb6ScV3Zu/9bm7/DyaLlx/gJhUPR1OxOzaqsEvl\n"+
                "u7hbDhNLIYo1zKFb/aUBbD6+UcaGxH2BfFNdzVAtVSVpc/s2Y3sboMN7rByUj793\n"+
                "7iQlaMINvVjyasynYuzHNw6ZRP9JP9fwxrCyaxnTPWxVl0qvVaQO2+TtFMtDXH2O\n"+
                "VZtWWeLHAL8cildw0G+u2qVqTqIGEwNyJlsAHykaPFAMW0xLueumrSlB+JUJPrRv\n"+
                "vw4nBCd4GOrNSlPCE/xlk1Cb8JaICTLvDUcYc3ZqL3jqAueBhkpw2uCz8xVJeOA1\n"+
                "KY4kQIIx8JEBsAYzgyP2iy0CAwEAAQ==\n"+
                "-----END PUBLIC KEY-----";

            var privateKeyPEMNotTrimmed = '     \n\n    \n\n ' + privateKeyPEM + '\n \n  \n\n  ';
            var publicKeyPEMNotTrimmed = '\n\n\n\n ' + publicKeyPEM + '\n \n\n\n  ';

            var fileKey = __dirname + "/private.key";
            var fileKeyPEM = "-----BEGIN RSA PRIVATE KEY-----\n"+
                "MIICXAIBAAKBgQCCdY+EpDC/vPa335l751SBM8d5Lf4z4QZX4bc+DqTY9zVY/rmP\n"+
                "GbTkCueKnIKApuOGMXJOaCwNH9wUftNt7T0foEwjl16uIC8m4hwSjjNL5TKqMVey\n"+
                "Syv04oBuidv76u5yNiLC4J85lbmW3WAyYkTCbm/VJZAXNJuqCm7AVWmQMQIDAQAB\n"+
                "AoGAEYR3oPfrE9PrzQTZNyn4zuCFCGCEobK1h1dno42T1Q5cu3Z4tB5fi79rF9Gs\n"+
                "NFo0cvBwyNZ0E88TXi0pdrlEW6mdPgQFd3CFxrOgKt9AGpOtI1zzVOb1Uddywq/m\n"+
                "WBPyETwEKzq7lC2nAcMUr0rlFrrDmUT2dafHeuWnFMZ/1YECQQDCtftsH9/prbgu\n"+
                "Q4F2lOWsLz96aix/jnI8FhBmukKmfLMXjCZYYv+Dsr8TIl/iriGqcSgGkBHHoGe1\n"+
                "nmLUZ4EHAkEAq4YcB8T9DLIYUeaS+JRWwLOejU6/rYdgxBIaGn2m0Ldp/z7lLM7g\n"+
                "b0H5Al+7POajkAdnDclBDhyxqInHO4VvBwJBAJ25jNEpgNhqQKg5RsYoF2RDYchn\n"+
                "+WPan+7McLzGZPc4TFrmzKkMiK7GPMHjNokJRXwr7aBjVAPBjEEy7BvjPEECQFOJ\n"+
                "4rcKAzEewGeLREObg9Eg6nTqSMLMb52vL1V9ozR+UDrHuDilnXuyhwPX+kqEDl+E\n"+
                "q3V0cqHb6c8rI4TizRsCQANIyhoJ33ughNzbCIknkMPKtgvLOUARnbya/bkfRexL\n"+
                "icyYzXPNuqZDY8JZQHlshN8cCcZcYjGPYYscd2LKB6o=\n"+
                "-----END RSA PRIVATE KEY-----";

            describe("Good cases", function () {
                it(".loadFromPrivatePEM() should load private key from (not trimmed) PEM string", function(){
                    privateNodeRSA = new NodeRSA(privateKeyPEMNotTrimmed);
                    assert.instanceOf(privateNodeRSA.keyPair, Object);
                    assert(privateNodeRSA.isPrivate());
                    assert(privateNodeRSA.isPublic());
                    assert(!privateNodeRSA.isPublic(true));
                });

                it(".loadFromPublicPEM() should load public key from (not trimmed) PEM string", function(){
                    publicNodeRSA = new NodeRSA(publicKeyPEMNotTrimmed);
                    assert.instanceOf(privateNodeRSA.keyPair, Object);
                    assert(publicNodeRSA.isPublic());
                    assert(publicNodeRSA.isPublic(true));
                    assert(!publicNodeRSA.isPrivate());
                });

                it(".getPrivatePEM() should return private PEM string", function(){
                    assert.equal(privateNodeRSA.getPrivatePEM(), privateKeyPEM);
                });

                it(".getPublicPEM() from public key should return public PEM string", function(){
                    assert.equal(publicNodeRSA.getPublicPEM(), publicKeyPEM);
                });

                it(".getPublicPEM() from private key should return public PEM string", function(){
                    assert.equal(privateNodeRSA.getPublicPEM(), publicKeyPEM);
                });

                it("should create key from buffer/fs.readFileSync output", function(){
                    var key = new NodeRSA(fs.readFileSync(fileKey));
                    assert.equal(key.getPrivatePEM(), fileKeyPEM);
                });

                it("should load PEM from buffer/fs.readFileSync output", function(){
                    var key = new NodeRSA();
                    assert.equal(key.isEmpty(), true);
                    key.loadFromPEM(fs.readFileSync(fileKey));
                    assert.equal(key.isEmpty(), false);
                    assert.equal(key.getPrivatePEM(), fileKeyPEM);
                });
            });

            describe("Bad cases", function () {
                it("not public key", function(){
                    var key = new NodeRSA();
                    assert.throw(function(){ key.getPrivatePEM(); }, Error, "It is not private key");
                    assert.throw(function(){ key.getPublicPEM(); }, Error, "It is not public key");
                });

                it("not private key", function(){
                    var key = new NodeRSA(publicKeyPEM);
                    assert.throw(function(){ key.getPrivatePEM(); }, Error, "It is not private key");
                    assert.doesNotThrow(function(){ key.getPublicPEM(); }, Error, "It is not public key");
                });
            });
        });
    });

    describe("Encrypting & decrypting", function(){
        describe("Good cases", function () {
			for(var scheme in schemeEncrypting){
				(function(scheme) {
					var encrypted = {};
					var decrypted = {};
                    for(var i in dataBundle) {
						(function(i) {
							var key = null;
							var suit = dataBundle[i];

							it("should encrypt " + i + " using " + scheme, function () {
								console.log();
								key = generatedKeys[Math.round(Math.random() * 1000) % generatedKeys.length];
								key.schemeEncryption = schemeEncrypting[scheme];
								encrypted[i] = key.encrypt(suit.data);
								assert(Buffer.isBuffer(encrypted[i]));
								assert(encrypted[i].length > 0);
							});

							it("should decrypt " + i + " using " + scheme, function () {
								console.log();
								decrypted[i] = key.decrypt(encrypted[i], _.isArray(suit.encoding) ? suit.encoding[0] : suit.encoding);
								if(Buffer.isBuffer(decrypted[i])) {
									assert.equal(suit.data.toString('hex'), decrypted[i].toString('hex'));
								} else {
									assert(_.isEqual(suit.data, decrypted[i]));
								}
							});
						})(i);
					}
                })(scheme);
			}
        });

        describe("Bad cases", function () {
            it("unsupported data types", function(){
                assert.throw(function(){ generatedKeys[0].encrypt(null); }, Error, "Unexpected data type");
                assert.throw(function(){ generatedKeys[0].encrypt(undefined); }, Error, "Unexpected data type");
                assert.throw(function(){ generatedKeys[0].encrypt(true); }, Error, "Unexpected data type");
            });

            it("incorrect key for decrypting", function(){
                var encrypted = generatedKeys[0].encrypt('data');
                assert.notEqual('data', generatedKeys[1].decrypt(encrypted));
            });
        });
    });


    describe("Signing & verifying", function () {
		describe("Good cases", function () {
			for(var scheme in schemeSigning){
				(function(scheme){
					for (var alg in signAlgorithms) {
						(function (alg) {
							var signed = {};
							var key = null;

							for (var i in dataBundle) {
								(function (i) {
									var suit = dataBundle[i];
									it("should sign " + i + " using " + scheme + " with hashing algorithm " + alg, function () {
										//key = new NodeRSA(generatedKeys[Math.round(Math.random() * 1000) % generatedKeys.length].getPrivatePEM());
										key = new NodeRSA(generatedKeys[5].getPrivatePEM()); // Some signatures+hash combinations will be larger than some of the smaller keys being tested. When that happens the signing process throws an error.
										key.schemeSignature = schemeSigning[scheme];
										key.schemeSignature.options.hash = alg;
										signed[i] = key.sign(suit.data);
										assert(Buffer.isBuffer(signed[i]));
										assert(signed[i].length > 0);
									});

									it("should verify " + i + " using " + scheme + " with hashing algorithm " + alg, function () {
										assert(key.verify(suit.data, signed[i]));
									});
								})(i);
							}
						})(signAlgorithms[alg]);
					}
				})(scheme);
			}
		});
		
		
		describe("Bad cases", function () {
			it("incorrect data for verifying", function () {
				var key = new NodeRSA(generatedKeys[5].getPrivatePEM());
				key.schemeSignature.options.hash = "sha1";
				var signed = key.sign('data1');
				assert(!key.verify('data2', signed));
			});

			it("incorrect key for signing", function () {
				var key = new NodeRSA(generatedKeys[5].getPublicPEM());
				key.schemeSignature.options.hash = "sha1";
				assert.throw(function () {
					key.sign('data');
				}, Error, "It is not private key");
			});

			it("incorrect key for verifying", function () {
				var key1 = new NodeRSA(generatedKeys[5].getPrivatePEM());
				var key2 = new NodeRSA(generatedKeys[1].getPublicPEM());
				var signed = key1.sign('data');
				assert(!key2.verify('data', signed));
			});

			it("incorrect key for verifying (empty)", function () {
				var key = new NodeRSA(null);
				key.schemeSignature.options.hash = "sha1";

				assert.throw(function () {
					key.verify('data', 'somesignature');
				}, Error, "It is not public key");
			});

			it("different algorithms", function () {
				var signKey = new NodeRSA(generatedKeys[0].getPrivatePEM());
				var verifyKey = new NodeRSA(generatedKeys[0].getPrivatePEM());
				NodeRSA.RSA.PSS.Default.options.hash = "sha1";
				var pssMD5 = new NodeRSA.RSA.PSS({hash: "md5"});
				verifyKey.schemeSignature = pssMD5;
				var signed = signKey.sign('data');
				assert(!verifyKey.verify('data', signed));
			});
		});

        describe.skip("Compatibility of different environments", function () { // This should no longer apply as both node and browser environments are using the rsa.js library
            for (var alg in signAlgorithms) {
                (function (alg) {
                    it("signing with custom algorithm (" + alg + ")", function () {
                        var nodeKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'node'});
                        var browserKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'browser'});

                        assert.equal(nodeKey.sign('data', 'hex'), browserKey.sign('data', 'hex'));
                    });

                    it("sign in node & verify in browser (" + alg + ")", function () {
                        var nodeKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'node'});
                        var browserKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'browser'});

                        assert(browserKey.verify('data', nodeKey.sign('data')));
                    });

                    it("sign in browser & verify in node (" + alg + ")", function () {
                        var nodeKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'node'});
                        var browserKey = new NodeRSA(generatedKeys[0].getPrivatePEM(), {signingAlgorithm: alg, environment: 'browser'});

                        assert(nodeKey.verify('data', browserKey.sign('data')));
                    });
                })(signAlgorithms[alg]);
            }

        });
    });
});