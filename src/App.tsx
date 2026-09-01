/**
 * Keycard Pal - Air-Gap Android wallet that works with Keycards
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import theme from './theme';
import type { RootStackParamList } from './navigation/types';
import { navigationRef } from './navigation/navigationRef';
import { routes } from './navigation/routes';
import { OnlineProviders } from './providers/onlineProviders.online';
import { loadWelcomeSeen } from './storage/preferencesStorage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // First-run gate: the navigator only mounts once the welcome_seen flag is
  // known, so the initial route can be Welcome without flashing the Dashboard.
  const [initialRouteName, setInitialRouteName] = useState<
    'Welcome' | 'Dashboard' | null
  >(null);

  useEffect(() => {
    loadWelcomeSeen().then(seen =>
      setInitialRouteName(seen ? 'Dashboard' : 'Welcome'),
    );
  }, []);

  return (
    <SafeAreaProvider style={styles.root}>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.background}
        />
        {initialRouteName != null && (
          <NavigationContainer ref={navigationRef}>
            <OnlineProviders>
              <Stack.Navigator
                initialRouteName={initialRouteName}
                screenOptions={{ headerShown: false }}
              >
                {routes.map(r => (
                  <Stack.Screen
                    key={r.name}
                    name={r.name}
                    component={r.component}
                    options={r.options}
                  />
                ))}
              </Stack.Navigator>
            </OnlineProviders>
          </NavigationContainer>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.background,
  },
});
