const { supabase } = require('./database');

async function autoExpireMemberships() {
    console.log('⏳ Checking for expired memberships...');
    const todayStr = new Date().toISOString().split('T')[0];
    try {
        const { count, error } = await supabase.from('memberships')
            .update({ status: 'expired' })
            .eq('status', 'active')
            .lte('end_date', todayStr);
        if (error) throw error;
        if (count > 0) console.log(`✅ Auto-expired ${count} memberships.`);
    } catch (err) {
        console.error('Auto-expiry error:', err);
    }
}

async function runDailyAutomation() {
    console.log('\n--- 🤖 Starting Daily Smart Notifications Automation ---');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMonthDay = todayStr.slice(5, 10); // "MM-DD"

    try {
        // 0. Cleanup and Expiry logic first
        await autoExpireMemberships();

        const allNotifications = [];

        // 1. Birthday Notifications (Bulk)
        const { data: bdayUsers } = await supabase.from('users')
            .select('id, full_name, birth_date')
            .not('birth_date', 'is', null);

        const targetBdays = (bdayUsers || []).filter(u => u.birth_date.slice(5, 10) === todayMonthDay);
        if (targetBdays.length > 0) {
            const userIds = targetBdays.map(u => u.id);
            // Check existing for today to prevent duplicates
            const { data: existingBday } = await supabase.from('notifications')
                .select('user_id')
                .in('user_id', userIds)
                .eq('title', `🎂 Doğum Günün Kutlu Olsun!`)
                .gte('sent_at', todayStr);

            const sentIds = new Set((existingBday || []).map(n => n.user_id));
            targetBdays.forEach(user => {
                if (!sentIds.has(user.id)) {
                    allNotifications.push({
                        user_id: user.id,
                        title: `🎂 Doğum Günün Kutlu Olsun!`,
                        body: `Sevgili ${user.full_name.split(' ')[0]}, MatchSport ailesi olarak sağlıklı ve spor dolu bir yıl dileriz! 🥳`,
                        type: 'announcement'
                    });
                }
            });
        }

        // 2. Inactivity (14 days) & Expiry Alerts (Bulk)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(today.getDate() - 14);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

        const { data: activeMembers } = await supabase.from('memberships')
            .select('user_id, end_date, users(full_name)')
            .eq('status', 'active');

        if (activeMembers && activeMembers.length > 0) {
            const userIds = activeMembers.map(m => m.user_id);

            // Check last check-ins for all active members in one go
            const { data: lastCheckIns } = await supabase.rpc('get_last_checkins', { user_ids: userIds });
            // Note: If RPC doesn't exist, we fallback to a slightly less efficient but better than N+1 method
            // For now, let's use a standard query and filter in memory since user count is usually manageable (<1000)
            const { data: checkInBatch } = await supabase.from('check_ins')
                .select('user_id, check_in_time')
                .in('user_id', userIds)
                .order('check_in_time', { ascending: false });

            const lastCheckInMap = {};
            (checkInBatch || []).forEach(c => {
                if (!lastCheckInMap[c.user_id]) lastCheckInMap[c.user_id] = c.check_in_time;
            });

            activeMembers.forEach(m => {
                const lastTime = lastCheckInMap[m.user_id];
                const endDate = new Date(m.end_date);
                const diffTime = endDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Inactivity Logic
                if (!lastTime || new Date(lastTime) < fourteenDaysAgo) {
                    allNotifications.push({
                        user_id: m.user_id,
                        title: `🔥 Seni Özledik!`,
                        body: `Merhaba ${m.users.full_name.split(' ')[0]}, 14 gündür aramızda yoksun. Tembellik yapma, antrenman seni bekliyor! 💪`,
                        type: 'announcement'
                    });
                }

                // Expiry Logic
                if ([14, 7, 3, 1].includes(diffDays)) {
                    let msg = "";
                    if (diffDays === 14) msg = "Üyeliğinin bitmesine tam 2 hafta kaldı. Devamlılık başarının anahtarıdır, tempoyu bozma! 💪";
                    else if (diffDays === 7) msg = "Üyeliğinin bitmesine son 1 hafta! Yeni hedefler için planlama yapmaya ne dersin? 🎯";
                    else if (diffDays === 3) msg = "Son 3 gün! Heyecanını kaybetme, spor salonu seni bekliyor. 🔥";
                    else if (diffDays === 1) msg = "Üyeliğin yarın sona eriyor! Yarın da antrenmanda görüşürüz değil mi? 😉";

                    allNotifications.push({
                        user_id: m.user_id,
                        title: `📅 Üyelik Hatırlatması (${diffDays} Gün)`,
                        body: `Selam ${m.users.full_name.split(' ')[0]}, ${msg}`,
                        type: 'announcement'
                    });
                }
            });
        }

        // 3. Re-engagement for Expired Members
        const { data: expiredMem } = await supabase.from('memberships')
            .select('user_id, end_date, users(full_name)')
            .eq('status', 'expired');

        expiredMem?.forEach(m => {
            const endDate = new Date(m.end_date);
            const diffDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays % 14 === 0) {
                const motivations = [
                    "Seni özledik! Spor salonundaki yerin hala boş duruyor. Gel, kaldığımız yerden devam edelim! 🏋️‍♂️",
                    "Eski formunu özlemedin mi? MatchSport kapıları sana her zaman açık, hedeflerini hatırla! ✨",
                    "Harekete geçmek için pazartesiyi bekleme! Bugün senin günün olsun, seni tekrar görmek istiyoruz. 💪",
                    "Vücuduna bir iyilik yap ve antrenmana geri dön. Senin için özel bir paketimiz olabilir, uğramayı unutma! 📞"
                ];
                const msgIndex = (diffDays / 14 - 1) % motivations.length;
                allNotifications.push({
                    user_id: m.user_id,
                    title: `🔥 Harekete Geçme Vakti!`,
                    body: `Selam ${m.users.full_name.split(' ')[0]}, ${motivations[msgIndex]}`,
                    type: 'announcement'
                });
            }
        });

        // Final Bulk Notification Insert with Guard
        if (allNotifications.length > 0) {
            // Quick guard to hide duplicates sent in the last 12 hours (in case script runs twice)
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
            const { data: recent } = await supabase.from('notifications')
                .select('user_id, title')
                .gte('sent_at', twelveHoursAgo);

            const recentSet = new Set((recent || []).map(n => `${n.user_id}|${n.title}`));
            const finalBatch = allNotifications.filter(n => !recentSet.has(`${n.user_id}|${n.title}`));

            if (finalBatch.length > 0) {
                const { error: insErr } = await supabase.from('notifications').insert(finalBatch);
                if (insErr) throw insErr;
                console.log(`✅ Sent ${finalBatch.length} automated messages.`);
            }
        }

        // 4. Cleanup Workout Logs (Older than 7 days)
        const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { error: cleanupError } = await supabase.from('workout_logs')
            .delete()
            .or(`workout_date.lt.${sevenDaysAgoStr}`); // Use simple date string for cleanup

        if (!cleanupError) console.log('✅ Cleaned up old workout logs.');

        // 5. Sync Gym Occupancy (Single Record)
        const { count: actualOccupancy } = await supabase.from('check_ins')
            .select('id', { count: 'exact', head: true })
            .is('check_out_time', null);

        const { data: latest } = await supabase.from('gym_occupancy')
            .select('current_count')
            .order('recorded_at', { ascending: false })
            .limit(1).maybeSingle();

        if (!latest || latest.current_count !== actualOccupancy) {
            await supabase.from('gym_occupancy').insert({
                current_count: actualOccupancy || 0,
                max_capacity: 100,
                hour_of_day: today.getHours(),
                day_of_week: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]
            });
            console.log(`✅ Synced gym occupancy: ${actualOccupancy}`);
        }

        console.log('--- 🤖 Automation Complete ---\n');
    } catch (err) {
        console.error('❌ Automation Error:', err);
    }
}

function startAutomation() {
    runDailyAutomation();
    setInterval(runDailyAutomation, 24 * 60 * 60 * 1000); // 24h
}

module.exports = { startAutomation };

