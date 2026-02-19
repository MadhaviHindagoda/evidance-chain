/**
 * Truffle Configuration
 * Network: Ganache (local development)
 */
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,          // Ganache GUI default; use 8545 for ganache CLI
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  contracts_directory: "./contracts",
  contracts_build_directory: "./build/contracts",
};
