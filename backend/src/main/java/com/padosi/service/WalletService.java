package com.padosi.service;

import com.padosi.dto.WalletResponse;
import com.padosi.dto.WalletTransactionResponse;
import com.padosi.entity.CoinTransaction;
import com.padosi.entity.User;
import com.padosi.repository.CoinTransactionRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class WalletService {

    public static final long COINS_PER_MONTH = 199L;
    private final UserRepository userRepository;
    private final CoinTransactionRepository transactionRepository;

    public WalletService(UserRepository userRepository, CoinTransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(Long userId) {
        User user = getUser(userId);
        List<WalletTransactionResponse> history = transactionRepository
                .findTop100ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(WalletTransactionResponse::from).toList();
        return new WalletResponse(user.getPadosiCoins() == null ? 0L : user.getPadosiCoins(), history);
    }

    /** Demo only: credits coins without contacting UPI or moving real money. */
    @Transactional
    public WalletResponse demoTopUp(Long userId, long coins) {
        if (coins < 1 || coins > 1_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Top-up must be between 1 and 1,000,000 coins");
        }
        User user = getBusinessUserForUpdate(userId);
        long balance = balance(user) + coins;
        user.setPadosiCoins(balance);
        userRepository.save(user);
        transactionRepository.save(CoinTransaction.builder()
                .user(user).entryType("CREDIT").amount(coins).balanceAfter(balance)
                .description("Demo UPI top-up (simulated; no real payment)").build());
        return getWallet(userId);
    }

    /** Deducts listing months and writes the ledger entry in the caller's transaction. */
    @Transactional
    public long chargeListing(Long userId, int months, String description) {
        if (months < 1 || months > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid listing duration");
        }
        User user = getBusinessUserForUpdate(userId);
        long amount = COINS_PER_MONTH * months;
        long balance = balance(user);
        if (balance < amount) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "Not enough Padosi Coins. Add at least " + (amount - balance) + " coins to continue.");
        }
        long newBalance = balance - amount;
        user.setPadosiCoins(newBalance);
        userRepository.save(user);
        transactionRepository.save(CoinTransaction.builder()
                .user(user).entryType("DEBIT").amount(amount).balanceAfter(newBalance)
                .description(description).build());
        return newBalance;
    }

    private User getBusinessUserForUpdate(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!"BUSINESS".equals(user.getAccountType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Padosi Coins and paid listings are available to Professional accounts only.");
        }
        return user;
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private long balance(User user) {
        return user.getPadosiCoins() == null ? 0L : user.getPadosiCoins();
    }
}
