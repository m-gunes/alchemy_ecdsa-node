const express = require("express");
const app = express();
const cors = require("cors");
const { secp256k1 } = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { utf8ToBytes, toHex } = require("ethereum-cryptography/utils");

const port = 3042;

app.use(cors());
app.use(express.json());

const balances = {
  "8bd7ca7ea7a3a0c567d1a1761eff609deb92671c": 100,
  "142597d763e990157614041d373de55d1fb40bf1": 50,
  "0631a589c9feaf5327705ebc05c2301953e095c3": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

// const reviver = (key, value) =>
//   key === "r" || key === "s" ? BigInt(value) : value;
// const sig = JSON.parse(signature, reviver);

app.post("/send", (req, res) => {
  // Get a signature from the client-side application
  // Recover the public address from the signature
  console.log(req.body);
  const { sender, recipient, amount, signature } = req.body;

  const msgHash = keccak256(utf8ToBytes(String(amount)));
  const sig = secp256k1.Signature.fromCompact(signature).addRecoveryBit(1);
  const publicKey = sig.recoverPublicKey(msgHash).toRawBytes();
  const address = toHex(keccak256(publicKey.slice(1)).slice(-20));
  const isValid = secp256k1.verify(signature, msgHash, publicKey);

  if (!isValid) {
    res.status(400).send({ message: "Invalid Signature!" });
  }

  if (!balances.hasOwnProperty(address)) {
    res.status(401).send({ message: "Unauthorized" });
  }

  setInitialBalance(sender);
  setInitialBalance(recipient);

  if (balances[sender] < amount) {
    res.status(400).send({ message: "Not enough funds!" });
  } else {
    balances[sender] -= amount;
    balances[recipient] += amount;
    res.send({ balance: balances[sender] });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
