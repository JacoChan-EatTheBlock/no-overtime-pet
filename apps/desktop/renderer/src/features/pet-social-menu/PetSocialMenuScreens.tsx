import { type FormEvent, useCallback, useEffect, useState } from 'react'
import {
  sendFriendRequest,
  getPendingRequests,
  acceptRequest as apiAcceptRequest,
  declineRequest as apiDeclineRequest,
  listFriends,
  removeFriend,
  updateVisibility,
} from '../../api/friends'
import type { Friend, FriendRequest } from '../../api/types'
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconCopy,
  IconDots,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconLogout,
  IconSettings,
  IconTarget,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import {
  FRIENDS,
  STATUS_CLASS_NAMES,
  type FriendFixture,
  type PetMotion,
  resolvePetMotionAssetPath
} from './petSocialMenu.fixtures'
import styles from './PetSocialMenuScreens.module.css'

export type PetSocialScreenId =
  | '00-default-pet'
  | '02-friend-pet-strip'
  | '08-friends-management'
  | '18-quick-menu'

interface PetSocialMenuScreensProps {
  screenId: PetSocialScreenId
}

interface PetArtworkProps {
  alt: string
  className?: string
  motion?: PetMotion
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function PetArtwork({ alt, className, motion = 'IDLE' }: PetArtworkProps) {
  return (
    <img
      className={joinClassNames(styles.petArtwork, className, 'pixel-art')}
      src={resolvePetMotionAssetPath(motion)}
      alt={alt}
      data-pet-motion={motion}
    />
  )
}

function StatusLabel({ friend }: { friend: FriendFixture }) {
  return (
    <span className={joinClassNames(styles.statusLabel, styles[STATUS_CLASS_NAMES[friend.status]])}>
      <span aria-hidden="true" className={styles.statusDot} />
      {friend.safeLabel}
    </span>
  )
}

export function DefaultDesktopPetScreen() {
  const [isSelected, setIsSelected] = useState(false)

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.defaultPetStage)}
      data-ui-screen="00-default-pet"
      data-ui-state={isSelected ? 'selected' : 'idle'}
    >
      <button
        type="button"
        className={styles.desktopPetButton}
        aria-label="桌宠水豚"
        aria-pressed={isSelected}
        onClick={() => setIsSelected((current) => !current)}
      >
        <PixelWindowHeader />
        <PetArtwork className={styles.defaultPet} alt="坐在电脑前工作的像素水豚" />
      </button>
    </main>
  )
}

const FRIENDS_PER_PAGE = 5

export function FriendPetStripScreen() {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(FRIENDS.length / FRIENDS_PER_PAGE)
  const visibleFriends = FRIENDS.slice(page * FRIENDS_PER_PAGE, (page + 1) * FRIENDS_PER_PAGE)
  const firstFriendNumber = page * FRIENDS_PER_PAGE + 1
  const lastFriendNumber = Math.min((page + 1) * FRIENDS_PER_PAGE, FRIENDS.length)

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.friendStripStage)}
      data-ui-screen="02-friend-pet-strip"
      data-ui-state={`page-${page + 1}`}
    >
      <section className={styles.friendStrip} aria-label="好友排排坐">
        <div className={styles.friendSeats}>
          {visibleFriends.map((friend) => (
            <article className={styles.friendSeat} key={friend.id}>
              <PetArtwork
                className={styles.friendPet}
                motion={friend.status}
                alt={`${friend.displayName}的像素桌宠`}
              />
              <strong>{friend.isSelf ? '我 · ' : ''}{friend.safeLabel}</strong>
            </article>
          ))}
        </div>

        <nav className={styles.friendPager} aria-label="好友桌宠分页">
          <button
            type="button"
            aria-label="上一组好友"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <IconChevronLeft size={24} stroke={2.2} aria-hidden="true" />
          </button>
          <span>好友 {firstFriendNumber}–{lastFriendNumber}/{FRIENDS.length}</span>
          <button
            type="button"
            aria-label="下一组好友"
            disabled={page === pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <IconChevronRight size={24} stroke={2.2} aria-hidden="true" />
          </button>
        </nav>
      </section>
    </main>
  )
}

type FriendProjectionState = Record<string, boolean>

export function FriendsManagementScreen() {
  // ── API state ──────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── UI state ───────────────────────────────────────────────────────────
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [openMenuFriendId, setOpenMenuFriendId] = useState<string | null>(null)
  const [projectionByFriend, setProjectionByFriend] = useState<FriendProjectionState>({})
  const [friendCode, setFriendCode] = useState('')
  const [feedback, setFeedback] = useState('')
  const [broadcastMode, setBroadcastMode] = useState('正常广播')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedFriend = friends.find((f) => f.relationId === selectedFriendId)
  const selectedFriendReceivesProjection = selectedFriend
    ? projectionByFriend[selectedFriend.relationId] !== false
    : true

  // ── Data fetching ──────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        listFriends(),
        getPendingRequests(),
      ])
      setFriends(friendsData)
      setRequests(requestsData)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Auto-select first friend when list loads
  useEffect(() => {
    if (friends.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].relationId)
    }
  }, [friends, selectedFriendId])

  // ── Handlers ───────────────────────────────────────────────────────────
  async function toggleProjection(relationId: string): Promise<void> {
    const currentlyVisible = projectionByFriend[relationId] !== false
    const newHidden = currentlyVisible
    // Optimistic update
    setProjectionByFriend((current) => ({ ...current, [relationId]: !newHidden }))
    setOpenMenuFriendId(null)
    try {
      await updateVisibility(relationId, newHidden)
    } catch (err) {
      // Revert on failure
      setProjectionByFriend((current) => ({ ...current, [relationId]: currentlyVisible }))
      setFeedback(err instanceof Error ? err.message : '更新可见性失败')
    }
  }

  async function handleRequest(requestId: string, action: 'accept' | 'decline'): Promise<void> {
    const request = requests.find((item) => item.id === requestId)
    setSubmitting(true)
    try {
      if (action === 'accept') {
        await apiAcceptRequest(requestId)
      } else {
        await apiDeclineRequest(requestId)
      }
      setRequests((current) => current.filter((item) => item.id !== requestId))
      const name = request?.requester?.displayName ?? '好友'
      setFeedback(`${name}的申请已${action === 'accept' ? '接受' : '拒绝'}`)
      if (action === 'accept') await refresh()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFriendCodeSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const code = friendCode.trim()
    if (!code) {
      setFeedback('请输入完整好友码')
      return
    }
    setSubmitting(true)
    try {
      await sendFriendRequest(code)
      setFeedback(`已向 ${code} 发送好友申请`)
      setFriendCode('')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveFriend(relationId: string): Promise<void> {
    setSubmitting(true)
    try {
      await removeFriend(relationId)
      setFriends((current) => current.filter((f) => f.relationId !== relationId))
      if (selectedFriendId === relationId) setSelectedFriendId('')
      setFeedback('好友已删除')
      setConfirmDeleteId(null)
      setOpenMenuFriendId(null)
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : '删除失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.managementStage)}
      data-ui-screen="08-friends-management"
      data-ui-state={selectedFriendReceivesProjection ? 'sharing-selected' : 'hidden-from-selected'}
    >
      <PixelSurface
        className={styles.friendsWindow}
        innerClassName={styles.friendsWindowInner}
        ariaLabel="好友管理"
      >
        <PixelWindowHeader />
        <header className={styles.friendsHeader}>
          <IconUsers size={44} stroke={1.7} aria-hidden="true" />
          <div>
            <h1>好友</h1>
            <p>只有互相接受后，才能看到桌宠状态。</p>
          </div>
          <button type="button" className={styles.closeButton} aria-label="关闭好友管理">
            <IconX size={34} stroke={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.friendCodeCard}>
          <strong>我的好友码</strong>
          <span>C7P4-K8M2</span>
          <button type="button" aria-label="复制好友码" onClick={() => setFeedback('好友码已复制')}>
            <IconCopy size={19} stroke={1.8} aria-hidden="true" />
            复制
          </button>
        </div>

        {error && <p className={styles.feedback} role="alert">{error}</p>}
        {loading && <p className={styles.feedback}>加载中…</p>}

        <div className={styles.friendsGrid}>
          <section className={styles.friendListSection} aria-labelledby="friend-list-title">
            <h2 id="friend-list-title">我的好友 <span>{friends.length}</span></h2>
            <div className={styles.friendList}>
              {friends.map((entry) => {
                const receivesProjection = projectionByFriend[entry.relationId] !== false

                return (
                  <div
                    className={joinClassNames(
                      styles.friendRow,
                      selectedFriendId === entry.relationId ? styles.selectedFriendRow : undefined
                    )}
                    key={entry.relationId}
                  >
                    <button
                      type="button"
                      className={styles.friendIdentity}
                      aria-label={`选择好友${entry.friend.displayName}`}
                      onClick={() => setSelectedFriendId(entry.relationId)}
                    >
                      <PetArtwork alt="" />
                      <strong>{entry.friend.displayName}</strong>
                    </button>
                    {receivesProjection ? (
                      <span className={styles.statusLabel}>好友</span>
                    ) : (
                      <span className={styles.hiddenProjectionLabel}>不对其展示</span>
                    )}
                    <button
                      type="button"
                      className={styles.rowMenuButton}
                      aria-label={`${entry.friend.displayName}好友操作`}
                      aria-expanded={openMenuFriendId === entry.relationId}
                      onClick={() => {
                        setSelectedFriendId(entry.relationId)
                        setOpenMenuFriendId((current) =>
                          current === entry.relationId ? null : entry.relationId
                        )
                      }}
                    >
                      <span className={styles.rowMenuTriggerIcon} aria-hidden="true">
                        <IconDots size={23} stroke={2} />
                      </span>
                      <IconChevronDown size={18} stroke={2} aria-hidden="true" />
                    </button>
                    {openMenuFriendId === entry.relationId ? (
                      <PixelSurface className={styles.rowMenu} innerClassName={styles.rowMenuInner}>
                        <button type="button" onClick={() => toggleProjection(entry.relationId)}>
                          {receivesProjection ? '不对其展示' : '恢复对其展示'}
                        </button>
                        <button type="button" onClick={() => {
                          setConfirmDeleteId(entry.relationId)
                          setOpenMenuFriendId(null)
                        }}>删除好友</button>
                      </PixelSurface>
                    ) : null}
                    {confirmDeleteId === entry.relationId ? (
                      <div className={styles.feedback}>
                        确定要删除{entry.friend.displayName}吗？
                        <Button variant="primary" disabled={submitting} onClick={() => handleRemoveFriend(entry.relationId)}>确认</Button>
                        <Button disabled={submitting} onClick={() => setConfirmDeleteId(null)}>取消</Button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className={styles.broadcastSummary}>
              <IconEye size={25} stroke={1.9} aria-hidden="true" />
              <span>我的可见状态：</span>
              <select
                className={styles.broadcastSelect}
                value={broadcastMode}
                onChange={(event) => setBroadcastMode(event.target.value)}
              >
                <option value="正常广播">正常广播</option>
                <option value="隐身">隐身</option>
              </select>
            </div>
          </section>

          <section className={styles.friendActionsSection} aria-label="好友操作">
            <form className={styles.addFriendForm} onSubmit={(e) => { handleFriendCodeSubmit(e) }}>
              <h2>添加好友</h2>
              <div>
                <input
                  aria-label="完整好友码"
                  placeholder="输入完整好友码"
                  value={friendCode}
                  onChange={(event) => setFriendCode(event.target.value)}
                />
                <Button variant="primary" type="submit" disabled={submitting}>发送申请</Button>
              </div>
            </form>

            <div className={styles.requestSection}>
              <h2>收到的申请 <span>{requests.length}</span></h2>
              {requests.length > 0 ? requests.map((request) => (
                <div className={styles.requestRow} key={request.id}>
                  <PetArtwork alt="" />
                  <strong>{request.requester?.displayName ?? '未知用户'}</strong>
                  <Button variant="primary" disabled={submitting} onClick={() => handleRequest(request.id, 'accept')}>接受</Button>
                  <Button disabled={submitting} onClick={() => handleRequest(request.id, 'decline')}>拒绝</Button>
                </div>
              )) : <p className={styles.emptyRequests}>暂无新的好友申请</p>}
            </div>

            <div className={styles.selectedFriendActions}>
              <p>
                <IconInfoCircle size={22} stroke={1.8} aria-hidden="true" />
                {selectedFriend
                  ? (selectedFriendReceivesProjection
                      ? `${selectedFriend.friend.displayName}当前可以看到你的桌宠和活动状态。`
                      : '对方将看不到你的桌宠和活动状态，好友关系仍保留。')
                  : '请选择好友。'}
              </p>
              <div>
                <Button
                  disabled={!selectedFriend || submitting}
                  onClick={() => selectedFriend && setConfirmDeleteId(selectedFriend.relationId)}
                >删除好友</Button>
                <Button
                  onClick={() => selectedFriend && toggleProjection(selectedFriend.relationId)}
                  disabled={!selectedFriend || submitting}
                >
                  {selectedFriendReceivesProjection ? (
                    <><IconEyeOff size={21} stroke={1.9} aria-hidden="true" />不对其展示</>
                  ) : (
                    <><IconEye size={21} stroke={1.9} aria-hidden="true" />恢复对其展示</>
                  )}
                </Button>
              </div>
            </div>

            <p className={styles.feedback} role="status">{feedback}</p>
          </section>
        </div>

        <p className={styles.privacyNotice}>
          <IconInfoCircle size={18} stroke={1.8} aria-hidden="true" />
          好友看不到你的任务、DDL、日薪、窝囊费或正在使用的应用。
        </p>
      </PixelSurface>
    </main>
  )
}

export function QuickMenuScreen() {
  const [isPetVisible, setIsPetVisible] = useState(true)
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(true)
  const [shareActivityWithFriends, setShareActivityWithFriends] = useState(true)
  const [showFriendPetsOnDesktop, setShowFriendPetsOnDesktop] = useState(true)
  const [muteLabel, setMuteLabel] = useState('1小时')

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.quickMenuStage)}
      data-ui-screen="18-quick-menu"
      data-ui-state={isVisibilityMenuOpen ? 'visibility-submenu-open' : 'menu-only'}
    >
      <div className={styles.quickMenuCluster}>
        <PixelSurface className={styles.quickMenu} innerClassName={styles.quickMenuInner} ariaLabel="快捷菜单">
          <header className={styles.quickMenuHeader}>
            <PetArtwork motion="WORKING" alt="" />
            <strong>不要加班 · <span>专注中</span></strong>
          </header>

          <div className={styles.quickMenuItems}>
            <button type="button">
              <IconClipboardList size={25} stroke={1.8} aria-hidden="true" />
              打开今日任务
            </button>
            <button type="button" onClick={() => setIsPetVisible((current) => !current)}>
              {isPetVisible
                ? <IconEyeOff size={25} stroke={1.8} aria-hidden="true" />
                : <IconEye size={25} stroke={1.8} aria-hidden="true" />}
              {isPetVisible ? '隐藏桌宠' : '显示桌宠'}
            </button>
            <button
              type="button"
              className={isVisibilityMenuOpen ? styles.highlightedMenuItem : undefined}
              aria-expanded={isVisibilityMenuOpen}
              onClick={() => setIsVisibilityMenuOpen((current) => !current)}
            >
              <IconTarget size={25} stroke={1.8} aria-hidden="true" />
              桌宠可见范围
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setMuteLabel((current) => current === '1小时' ? '关闭' : '1小时')}>
              <IconBell size={25} stroke={1.8} aria-hidden="true" />
              通知静音
              <span>{muteLabel}</span>
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button">
              <IconSettings size={25} stroke={1.8} aria-hidden="true" />
              设置
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button" className={styles.exitMenuItem}>
              <IconLogout size={25} stroke={1.9} aria-hidden="true" />
              退出应用
            </button>
          </div>

          <p className={styles.exitHint}>退出应用不会自动下班</p>
        </PixelSurface>

        {isVisibilityMenuOpen ? (
          <PixelSurface
            className={styles.visibilitySubmenu}
            innerClassName={styles.visibilitySubmenuInner}
            ariaLabel="桌宠可见范围"
          >
            <label>
              <input
                type="checkbox"
                checked={shareActivityWithFriends}
                onChange={(event) => setShareActivityWithFriends(event.target.checked)}
              />
              <span className={styles.pixelCheckbox} aria-hidden="true">
                {shareActivityWithFriends ? <IconCheck size={18} stroke={2.5} /> : null}
              </span>
              允许好友查看我的活动状态
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFriendPetsOnDesktop}
                onChange={(event) => setShowFriendPetsOnDesktop(event.target.checked)}
              />
              <span className={styles.pixelCheckbox} aria-hidden="true">
                {showFriendPetsOnDesktop ? <IconCheck size={18} stroke={2.5} /> : null}
              </span>
              在桌面显示好友桌宠
            </label>
          </PixelSurface>
        ) : null}
      </div>

      {isPetVisible ? (
        <div className={styles.quickMenuPetArea}>
          <PixelSurface className={styles.taskBubble} innerClassName={styles.taskBubbleInner}>
            <span aria-hidden="true" className={styles.taskDot} />
            写方案 · 36分钟
          </PixelSurface>
          <PetArtwork
            className={styles.quickMenuPet}
            motion="WORKING"
            alt="坐在电脑前工作的像素水豚"
          />
        </div>
      ) : null}
    </main>
  )
}

export function PetSocialMenuScreens({ screenId }: PetSocialMenuScreensProps) {
  switch (screenId) {
    case '00-default-pet':
      return <DefaultDesktopPetScreen />
    case '02-friend-pet-strip':
      return <FriendPetStripScreen />
    case '08-friends-management':
      return <FriendsManagementScreen />
    case '18-quick-menu':
      return <QuickMenuScreen />
  }
}
