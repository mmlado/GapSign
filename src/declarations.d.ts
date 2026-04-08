declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'slip39' {
  type Slip39Node = {
    mnemonics: string[];
  };

  type Slip39Options = {
    passphrase?: string;
    threshold?: number;
    groups?: Array<[number, number, string?]>;
    iterationExponent?: number;
    extendableBackupFlag?: number;
    title?: string;
  };

  type Slip39 = {
    fromPath(path: string): Slip39Node;
  };

  const slip39: {
    fromArray(masterSecret: number[], options?: Slip39Options): Slip39;
    recoverSecret(mnemonics: string[], passphrase?: string): number[];
    validateMnemonic(mnemonic: string): boolean;
  };

  export = slip39;
}

declare module 'slip39/src/slip39_helper.js' {
  export const WORD_LIST: string[];
  export function validateMnemonic(mnemonic: string): boolean;
}

declare module 'node-libs-react-native/globals';

declare module 'ripemd160';
