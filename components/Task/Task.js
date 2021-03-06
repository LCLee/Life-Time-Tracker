/**
 * @jsx React.DOM
 */
var React = require('react');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
var Router = require('react-router');
var Moment = require('moment');
var Link = Router.Link;
var Q = require('q');
var _ = require('lodash');
var cx = React.addons.classSet;
var Router = require('react-router');
var Bus = require('../../utils/Bus');

/**components*/
var Progress = require('../Progress');
var TaskList = require('../Task/TaskList');
var DataAPI = require('../../utils/DataAPI');

/** utils */
var Util = require('../../utils/Util.js');

/** Constant */
var EMPTY_FUN = function () {};
var EventConstant = require('../../constants/EventConstant');

var Task = React.createClass({

    mixins: [Router.State, Router.Navigation],

    getInitialState: function () {
        return {
            isOpen: this.props.defaultIsOpen,
            selected: this.props.selected,
            marked: this.props.data.marked
        };
    },

    getDefaultProps: function () {
        return {
            defaultIsOpen: true,
            selected: false,
            displayChildren: true,
            onTaskChange: EMPTY_FUN,
            dueTime: false,
            totalTime: true,
            todayTime: null,
            onClick: EMPTY_FUN
            //onUnMark: EMPTY_FUN
        };
    },

    componentWillReceiveProps: function (newProps) {
        //if user close the task, then should not open again
        if (!this.isOpen) {
            return this.setState({
                selected: newProps.selected
            });
        }
        this.setState({
            isOpen: newProps.defaultIsOpen,
            selected: newProps.selected
        });
    },


    render: function () {
        var task = this.props.data;
        var taskId = this.props.taskId;
        var version = this.props.version;
        var project = this.props.project;
        var todayTime = this.props.todayTime;
        var todayTimeChildren;
        var url;
        var that = this;
        var progress;
        if (todayTime) {
            todayTimeChildren = todayTime.children || [];
        }
        if (task.progress >= 0 ) {
            if (task.progress < 100) {
                progress = (<Progress max={100} value={task.progress}/>);
            } else {
                progress = (<span className="ltt_c-task-done"><i className="fa fa-check-circle"></i></span>)
            }
        }
        var subTasks = task.children,
            subTaskList = null,
            hasSubTasks = !_.isEmpty(subTasks);
        if (hasSubTasks && this.state.isOpen && this.props.displayChildren) {
            subTaskList = (
                <TaskList className="subtask">
                    {subTasks.map(function (task) {
                        if (!_.isObject(task)) {return null;}
                        var subTaskTodayTime = todayTimeChildren && todayTimeChildren.filter(function (item) {
                            return item._id === task._id;
                        })[0];
                        return (<Task {... _.pick(that.props, ['onClick', 'onDoubleClick', 'dueTime'])}
                            data={task}
                            key={task.id}
                            todayTime={subTaskTodayTime}
                            selected={task._id === taskId}/>);
                    })}
                </TaskList>
            );
        }
        var openButton;
        if (hasSubTasks && this.props.displayChildren) {
            openButton = <div className="ltt_c-task-openButton" onClick={this.toggle}>
                {<i className={'ltt_c-task-openButton-icon fa ' + (this.state.isOpen ? 'fa-chevron-down' : 'fa-chevron-right')}></i>}
            </div>
        }
        var link;
        if (task.attributes && (link = task.attributes.link)) {
            link = <span className="title-btn" onClick={this.openTaskExternalLink.bind(this, link)} title={link} ><i className="fa fa-external-link"></i></span>
        }

        var dueTime;
        if (this.props.dueTime && task.dueTime) {
            dueTime = new Moment(task.dueTime);
            dueDiffDays = dueTime.diff(Date.now(), 'day');
        }

        return (
            <li className={cx({"ltt_c-task": true, "done": task.progress === 100})} data-id={task._id} onDoubleClick={this.props.onDoubleClick} onClick={this.select}>
                <div className={cx({"ltt_c-task-title": true, 'selected' : this.state.selected})}>
                    {openButton}
                    <span className="ltt_c-task-title-text" onClick={this.props.onTitleClick}>{task.name}</span>
                    {link}
                    <span className="title-btn" onClick={this.insertLog}><i className="fa fa-pencil-square-o"/></span>
                    {todayTime ? <span className="ltt_c-task-todayTime">{Util.displayTime(todayTime.totalTime)}</span> : null}
                    <span className={"ltt_c-task-mark " + (this.state.marked ? 'marked': '')} onClick={this.toggleMark}>
                        <i className={this.state.marked ? 'fa fa-flag' : 'fa fa-flag-o'}></i>
                    </span>
                    <div className="ltt_c-task-basicInfo">
                        <div className="ltt_c-task-basicInfo-hierarchy">
                            {_.isObject(task.projectId) ?
                                <span className="hierarchy-item ltt-link" onClick={this.gotoProject}><i className="fa  fa-rocket"></i>{task.projectId.name}</span>
                                :null}
                            {_.isObject(task.versionId) ?
                                <span className="hierarchy-item ltt-link" onClick={this.gotoVersion}><i className="fa  fa-sitemap"></i>{task.versionId.name}</span>
                                : null}
                            {dueTime ? <span className="ltt_c-task-timeInfo-item" title={dueTime.format('YYYY-MM-DD HH:mm:ss')}>
                                {dueTime.diff(Date.now()) > 0 ?
                                    <span className={cx({"willDue": true,  "warning": dueDiffDays > 0 && dueDiffDays <= 3})}>will due {dueTime.fromNow()} at {dueTime.format('YYYY-MM-DD HH:mm')}</span>
                                    :
                                    <span className="overDue">due {dueTime.fromNow()} at {dueTime.format('YYYY-MM-DD HH:mm')}</span>
                                }
                            </span> : null}
                        </div>
                        <div className="ltt_c-task-timeInfo">
                            <span className="ltt_c-task-timeInfo-item" title={new Moment(task.createTime).format('YYYY-MM-DD HH:mm:ss')}>
                                <i className="fa fa-plus" title="create time"></i>
                                {new Moment(task.createTime).fromNow()}
                            </span>
                            {this.props.totalTime ?
                            <span  className="ltt_c-task-timeInfo-item">
                                <i className="fa fa-clock-o" title="total time"></i>
                                {Moment.duration(task.totalTime, "minutes").format("M[m],d[d],h[h],mm[min]")} across {new Moment(task.lastActiveTime).from(task.createTime, true)}
                            </span> : null
                            }
                            <span  className="ltt_c-task-timeInfo-item" title={new Moment(task.lastActiveTime).format('YYYY-MM-DD HH:mm:ss')}>
                                <i className="fa fa-user" title="last active"></i>
                                {new Moment(task.lastActiveTime).fromNow()}
                            </span>
                            <span  className="ltt_c-task-timeInfo-item" title={new Moment(task.completeTime).format('YYYY-MM-DD HH:mm:ss')}>
                                <i className="fa fa-check-circle" title="completed time"></i>
                                {new Moment(task.completeTime).fromNow()}
                            </span>
                        </div>
                    </div>
                    {progress}
                </div>
                {subTaskList}
            </li>
        );
    },

    renderPercent: function () {
        var version = this.props.version;
        var project = this.props.project;
        var task = this.props.data;
        if (!task.totalTime || !version && !project) {
            return null;
        }
        return (
            <div className="ltt_c-task-basicInfo-percent">
            {!version ?
                <span className="num">{(task.totalTime / project.totalTime * 100).toFixed(1)}% of {project.name}</span>
                :
                <span className="num">{(task.totalTime / version.totalTime * 100).toFixed(1)}% of {version.name}</span>
            }
            </div>
        );
    },

    gotoProject: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var task = this.props.data;
        var projectId = task.projectId._id || task.projectId;
        this.transitionTo('projectTask', {projectId: projectId});
    },

    gotoVersion: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var task = this.props.data;
        var projectId = task.projectId._id || task.projectId;
        var versionId = task.versionId._id || task.versionId;
        this.transitionTo('projectVersionTask', {projectId: projectId, versionId: versionId});
    },

    select: function (e) {
        var className = e.target.className;
        if (className.indexOf('ltt_c-task-openButton') >= 0
            || className.indexOf('ltt_c-task-openButton-icon') >= 0) {
            e.stopPropagation();
            return false;
        }
        this.setState({
            selected: true
        }, function () {
            this.props.onClick(this.props.data, e);
        });
    },

    toggleMark: function (e) {
        e.stopPropagation();
        this.setState({
            marked: !this.state.marked
        }, function () {
            var that = this;
            DataAPI.Task.update({id: this.props.data._id, marked: this.state.marked}).then(function (task) {
                that.props.onTaskChange(task);
            });
        });
    },

    toggle: function () {
        this.setState({
            isOpen: !this.state.isOpen
        });
    },

    get: function (attrName) {
        return this.props[attrName];
    },

    update: function (data) {
        var deferred = Q.defer();
        var taskId = this.props.data._id;
        console.log('update task ' + taskId);
        $.ajax({
            type: "POST",
            url: '/api/tasks/' + taskId,
            data: data,
            success: function (result) {
                deferred.resolve(result);
            },
            error: function (err) {
                console.error(err);
                deferred.reject(err);
            },
            dataType: 'json'
        });
        return deferred.promise;
    },

    complete: function () {
        return this.update({progress: 100});
    },

    todo: function () {
        return this.update({progress: -1});
    },

    start: function () {
        return this.update({progress: 0});
    },

    openTaskExternalLink: function (link) {
        console.log('openExternalLink', link);
        Ltt.openExternalLink(link);
    },

    insertLog: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var that = this;
        var task = this.props.data;
        DataAPI.Log.load({
            taskId: task._id,
            sort: 'start:-1',
            limit: 1
        }).then(function (log) {
            if (!_.isEmpty(log)) {
                Bus.emit(EventConstant.INSERT_LOG_FROM_TASK, log[0]);
                that.transitionTo('logEditor', {date: new Moment().format('YYYY-MM-DD')});
            }
        });
    },
});

module.exports = Task;