/**
 * GapSign - Air-Gap Android wallet that works with Keycards
 *
 * @format
 */

import 'react-native-get-random-values';
import './shims';

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import theme from './theme';
import type {SigningStackParamList} from './navigation/types';
import KeycardTestScreen from './screens/KeycardTestScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';

const Stack = createNativeStackNavigator<SigningStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="KeycardTest" component={KeycardTestScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{
                headerShown: true,
                title: 'Review transaction',
                headerStyle: {backgroundColor: theme.colors.background},
                headerTintColor: theme.colors.onSurface,
                headerTitleStyle: {fontWeight: '600'},
                headerShadowVisible: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
