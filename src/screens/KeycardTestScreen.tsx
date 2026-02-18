import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import RNKeycard from 'react-native-keycard';
import Keycard from 'keycard-sdk';
import NFCBottomSheet from '../components/NFCBottomSheet';
import {loadPairing, savePairing} from '../storage/pairingStorage';

// Pairing password must match the one set on the card during initialization.
// TODO: replace with user-entered value once the pairing flow is built.
const PAIRING_PASSWORD = 'KeycardTest';

function toHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function KeycardTestScreen() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [status, setStatus] = useState('Hold your device near your Keycard');
  const [instanceUID, setInstanceUID] = useState<string | null>(null);
  const [channelOpen, setChannelOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Active Commandset for the current NFC session.
  // Nulled on disconnect so the ephemeral ECDH session keys are garbage-collected.
  const cmdSetRef = useRef<Keycard.Commandset | null>(null);

  const handleCardConnected = useCallback(async () => {
    console.log('[Keycard] Card connected');
    try {
      // ── Step 1: SELECT ────────────────────────────────────────────────────
      // select() also generates the ephemeral ECDH key pair inside SecureChannel
      // (via secureChannel.generateSecret) using the card's public key.
      setStatus('Selecting applet...');
      console.log('[Keycard] Step 1: SELECT');
      const channel = new RNKeycard.NFCCardChannel();
      const cmdSet = new Keycard.Commandset(channel);
      cmdSetRef.current = cmdSet;

      const selectResp = await cmdSet.select();
      console.log(`[Keycard] SELECT SW: 0x${selectResp.sw.toString(16).toUpperCase()}`);
      if (selectResp.sw !== 0x9000) {
        setStatus(`SELECT failed: 0x${selectResp.sw.toString(16).toUpperCase()}`);
        return;
      }

      const appInfo = cmdSet.applicationInfo;
      if (!appInfo) {
        console.log('[Keycard] SELECT: no application info');
        setStatus('No application info in SELECT response');
        return;
      }

      const uid = toHex(appInfo.instanceUID);
      console.log(`[Keycard] SELECT OK — UID: ${uid}, initialized: ${appInfo.initializedCard}, freePairingSlots: ${appInfo.freePairingSlots}, hasMasterKey: ${appInfo.hasMasterKey()}`);
      setInstanceUID(uid);

      // ── Step 2: Pairing ───────────────────────────────────────────────────
      // Pairing is a long-lived shared secret stored per InstanceUID in
      // encrypted storage (Android EncryptedSharedPreferences / iOS Keychain).
      console.log('[Keycard] Step 2: Pairing');
      const existingPairing = await loadPairing(uid);
      if (existingPairing) {
        console.log(`[Keycard] Pairing found in storage (index: ${existingPairing.pairingIndex})`);
        cmdSet.setPairing(existingPairing);
        setStatus('Pairing found. Opening secure channel...');
      } else {
        console.log('[Keycard] No pairing found — running autoPair');
        setStatus('Pairing with card...');
        await cmdSet.autoPair(PAIRING_PASSWORD);
        const pairing = cmdSet.getPairing();
        console.log(`[Keycard] autoPair OK (index: ${pairing.pairingIndex}) — saving to storage`);
        await savePairing(uid, pairing);
        setStatus('Paired. Opening secure channel...');
      }

      // ── Step 3: Open secure channel ───────────────────────────────────────
      // autoOpenSecureChannel = openSecureChannel (ephemeral ECDH)
      //                       + processOpenSecureChannelResponse (derive session keys)
      //                       + mutuallyAuthenticate (both sides prove knowledge)
      console.log('[Keycard] Step 3: autoOpenSecureChannel');
      await cmdSet.autoOpenSecureChannel();
      console.log('[Keycard] Secure channel open');
      setChannelOpen(true);

      // ── Step 4: Verify PIN ────────────────────────────────────────────────
      // TODO: replace hardcoded PIN with user-entered value.
      console.log('[Keycard] Step 4: verifyPIN');
      setStatus('Verifying PIN...');
      const pinResp = await cmdSet.verifyPIN('123456');
      console.log(`[Keycard] verifyPIN SW: 0x${pinResp.sw.toString(16).toUpperCase()}`);
      pinResp.checkAuthOK();
      console.log('[Keycard] PIN verified');

      // ── Step 5: Sign ──────────────────────────────────────────────────────
      // Test hash: 32 bytes of 0x42. Will be replaced with real tx hash.
      const testHash = new Uint8Array(32).fill(0x42);
      console.log(`[Keycard] Step 5: sign — hash: ${toHex(testHash)}`);
      setStatus('Signing...');
      const signResp = await cmdSet.sign(testHash);
      console.log(`[Keycard] sign SW: 0x${signResp.sw.toString(16).toUpperCase()}, data: ${toHex(signResp.data)}`);
      signResp.checkOK();

      // SDK type definition incorrectly marks all props required;
      // the constructor only needs hash + tlvData to parse from a response.
      const sig = new Keycard.RecoverableSignature({
        hash: testHash,
        tlvData: signResp.data,
      } as any);
      console.log(`[Keycard] Signature — r: ${toHex(sig.r!)}, s: ${toHex(sig.s!)}, v: ${sig.recId}`);
      setSignature(
        `r: ${toHex(sig.r!)}\ns: ${toHex(sig.s!)}\nv: ${sig.recId}`,
      );
      setStatus('Signed');
      setSheetVisible(false);
    } catch (error: any) {
      console.log(`[Keycard] Error: ${error.message}`, error);
      setStatus(`Error: ${error.message}`);
      // Release on error — ephemeral keys are garbage-collected.
      cmdSetRef.current = null;
    }
  }, []);

  const handleCardDisconnected = useCallback(() => {
    console.log('[Keycard] Card disconnected — releasing Commandset');
    // Null out the Commandset so the ephemeral session keys are garbage-collected.
    cmdSetRef.current = null;
    setChannelOpen(false);
    setStatus('Card removed — tap again');
  }, []);

  useEffect(() => {
    const connectedSub = RNKeycard.Core.onKeycardConnected(handleCardConnected);
    const disconnectedSub = RNKeycard.Core.onKeycardDisconnected(
      handleCardDisconnected,
    );
    const cancelledSub = RNKeycard.Core.onNFCUserCancelled(() => {
      console.log('[Keycard] NFC cancelled by user');
      setSheetVisible(false);
    });
    const timeoutSub = RNKeycard.Core.onNFCTimeout(() => {
      console.log('[Keycard] NFC timed out');
      setStatus('Timed out — tap again');
    });

    console.log('[Keycard] Starting NFC session');
    RNKeycard.Core.startNFC('Tap your Keycard')
      .then(() => {
        console.log('[Keycard] NFC session started');
        setSheetVisible(true);
      })
      .catch((err: any) => {
        console.log(`[Keycard] Failed to start NFC: ${err.message}`);
        setStatus(`Failed to start NFC: ${err.message}`);
      });

    return () => {
      connectedSub.remove();
      disconnectedSub.remove();
      cancelledSub.remove();
      timeoutSub.remove();
      RNKeycard.Core.stopNFC().catch(() => {});
    };
  }, [handleCardConnected, handleCardDisconnected]);

  const handleCancel = useCallback(async () => {
    await RNKeycard.Core.stopNFC().catch(() => {});
    setSheetVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      {instanceUID !== null && (
        <Text variant="bodySmall" style={styles.uid}>
          Instance UID:{'\n'}
          {instanceUID}
        </Text>
      )}
      {channelOpen && signature === null && (
        <Text variant="titleMedium" style={styles.channelOpen}>
          Secure channel open
        </Text>
      )}
      {signature !== null && (
        <Text variant="bodySmall" style={styles.signature}>
          {signature}
        </Text>
      )}
      <NFCBottomSheet
        visible={sheetVisible}
        status={status}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 24,
  },
  uid: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  channelOpen: {
    color: '#03dac6',
  },
  signature: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace',
    textAlign: 'left',
    lineHeight: 20,
  },
});
