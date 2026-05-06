const handleSubmit = async () => {
  if (!content.trim()) { alert('리뷰 내용을 입력해주세요'); return }
  if (!storeId) { alert('가게 정보가 없습니다'); return }
  setLoading(true)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 카카오 가게를 Supabase stores 테이블에 upsert
    let realStoreId = storeId

    // UUID 형식이 아니면 카카오 가게 → Supabase에 저장
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)
    if (!isUUID) {
      // 이미 저장된 가게인지 확인
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('kakao_id', storeId)
        .single()

      if (existingStore) {
        realStoreId = existingStore.id
      } else {
        // 새로 저장
        const storeAddress = searchParams.get('store_address') || ''
        const storeCategory = searchParams.get('store_category') || '음식점'
        const storeLat = parseFloat(searchParams.get('store_lat') || '0')
        const storeLng = parseFloat(searchParams.get('store_lng') || '0')
        const storePhone = searchParams.get('store_phone') || ''

        const { data: newStore, error: storeError } = await supabase
          .from('stores')
          .insert({
            kakao_id: storeId,
            name: storeName,
            category: storeCategory,
            address: storeAddress,
            latitude: storeLat,
            longitude: storeLng,
            phone: storePhone,
          })
          .select('id')
          .single()

        if (storeError) {
          console.error('가게 저장 오류:', storeError)
          alert('가게 저장 오류: ' + storeError.message)
          setLoading(false)
          return
        }
        realStoreId = newStore.id
      }
    }

    // 최초 리뷰 여부 확인
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('id')
      .eq('store_id', realStoreId)

    const isFirstReview = !existingReviews || existingReviews.length === 0

    // 리뷰 저장
    const { error: reviewError } = await supabase.from('reviews').insert({
      user_id: user.id,
      store_id: realStoreId,
      taste_score: tasteScore,
      portion_score: portionScore,
      value_score: valueScore,
      spiciness_actual: spiciness,
      saltiness_actual: saltiness,
      content: content.trim(),
      photos: [],
      visit_verified: false,
      quality_score: (tasteScore + portionScore + valueScore) / 3,
    })

    if (reviewError) {
      console.error('리뷰 저장 오류:', reviewError)
      alert('리뷰 저장 오류: ' + reviewError.message)
      setLoading(false)
      return
    }

    // review_count 업데이트
    await supabase.rpc('increment_review_count', { store_id_input: realStoreId })

    // 최초 리뷰 배지
    if (isFirstReview) {
      const { data: profile } = await supabase
        .from('user_taste_profile')
        .select('badges')
        .eq('user_id', user.id)
        .single()

      const currentBadges = profile?.badges || []
      const newBadge = {
        id: 'first_review',
        name: '최초 등록자',
        emoji: '🥇',
        store: storeName,
        earned_at: new Date().toISOString()
      }

      if (!currentBadges.find((b: any) => b.id === 'first_review' && b.store === storeName)) {
        await supabase
          .from('user_taste_profile')
          .update({ badges: [...currentBadges, newBadge] })
          .eq('user_id', user.id)
        alert(`🥇 축하합니다! "${storeName}" 최초 리뷰 등록자 배지를 획득했습니다!`)
      }
    }

    alert('리뷰가 등록되었습니다! 🎉')
    router.push('/map')

  } catch (err) {
    console.error(err)
    alert('오류가 발생했습니다')
  } finally {
    setLoading(false)
  }
}
