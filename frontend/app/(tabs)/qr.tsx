import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import { scanQR } from '@/services/api';

export default function QRScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState(0);

    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission]);

    if (!permission) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.permissionText}>Kamera izni gerekiyor</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>İzin Ver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        const now = Date.now();
        if (scanning || now - lastScan < 3000) return; // Wait 3s between scans

        setScanning(true);
        setLastScan(now);
        try {
            const res = await scanQR(data);
            Alert.alert('İşlem Başarılı', res.message);
        } catch (error: any) {
            Alert.alert('Erişim Reddedildi', error.response?.data?.error || 'Geçersiz QR kod veya üyelik problemi.');
        } finally {
            setScanning(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>QR Okut</Text>
                <Text style={styles.subtitle}>Salondaki Giriş veya Çıkış QR kodunu okutun</Text>
            </View>

            <View style={styles.scannerWrapper}>
                <CameraView
                    style={styles.camera}
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.scanFrame} />
                    </View>
                </CameraView>
            </View>

            <View style={styles.footer}>
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>Kamerayı giriş/çıkış noktasındaki koda tutun.</Text>
                </View>
                <Text style={styles.disclaimer}>Matchless Fitness Access Control</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    scannerWrapper: {
        flex: 1,
        marginHorizontal: 30,
        marginVertical: 20,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    footer: {
        padding: 40,
        alignItems: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    infoText: {
        color: Colors.text,
        fontSize: 14,
        flex: 1,
    },
    disclaimer: {
        fontSize: 12,
        color: Colors.textMuted,
        opacity: 0.5,
    },
    permissionText: {
        color: Colors.text,
        fontSize: 18,
        marginTop: 16,
        marginBottom: 24,
    },
    permissionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
