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
import DashboardScreen from './screens/DashboardScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import KeycardScreen from './screens/KeycardScreen';
import QRResultScreen from './screens/QRResultScreen';

const Stack = createNativeStackNavigator<SigningStackParamList>();

const headerStyle = {backgroundColor: theme.colors.background};
const headerTitleStyle = {fontWeight: '600' as const};

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
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{
                headerShown: true,
                title: 'Review transaction',
                headerStyle,
                headerTintColor: theme.colors.onSurface,
                headerTitleStyle,
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="Keycard"
              component={KeycardScreen}
              options={{
                headerShown: true,
                title: '',
                headerStyle,
                headerTintColor: theme.colors.onSurface,
                headerTitleStyle,
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="QRResult"
              component={QRResultScreen}
              options={{
                headerShown: true,
                title: 'Signature',
                headerStyle,
                headerTintColor: theme.colors.onSurface,
                headerTitleStyle,
                headerShadowVisible: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
